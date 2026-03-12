/**
 * POST /api/a2a/rpc
 *
 * Google A2A Protocol — JSON-RPC 2.0 Endpoint
 *
 * Implements the core A2A methods:
 *   - sendMessage     → Create task + execute agent
 *   - getTask         → Retrieve task status
 *   - listTasks       → List tasks with filters
 *   - cancelTask      → Cancel a running task
 *
 * External AI agents communicate with PayPol through this
 * standard A2A interface. Maps A2A messages to PayPol jobs.
 *
 * Spec: https://a2a-protocol.org/latest/specification/
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { validateApiKey, requireWalletAuth } from '@/app/lib/api-auth';
import { apiLimiter, writeLimiter, getClientId } from '@/app/lib/rate-limit';
import {
  JsonRpcRequest,
  A2ATask,
  A2AMessage,
  A2ATextPart,
  A2ADataPart,
  A2A_ERRORS,
  getTask,
  setTask,
  listTasks,
  jsonRpcSuccess,
  jsonRpcError,
} from '@/app/lib/a2a-protocol';

// ── Agent Service URL ──────────────────────────────────────

const AGENT_SERVICE = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';

// ── Main JSON-RPC Handler ──────────────────────────────────

export async function POST(req: Request) {
  try {
    // Rate limit
    const clientId = getClientId(req);
    const limit = apiLimiter.check(clientId);
    if (!limit.success) {
      return NextResponse.json(
        jsonRpcError(0, { code: -32000, message: 'Rate limit exceeded' }),
        { status: 429 },
      );
    }

    const body = await req.json();

    // Validate JSON-RPC 2.0 format
    if (!body.jsonrpc || body.jsonrpc !== '2.0' || !body.method) {
      return NextResponse.json(
        jsonRpcError(body.id || 0, A2A_ERRORS.INVALID_REQUEST),
        { status: 400 },
      );
    }

    const rpc = body as JsonRpcRequest;

    // Route to method handler
    switch (rpc.method) {
      case 'sendMessage':
        return handleSendMessage(rpc, req);
      case 'getTask':
        return handleGetTask(rpc);
      case 'listTasks':
        return handleListTasks(rpc);
      case 'cancelTask':
        return handleCancelTask(rpc);
      default:
        return NextResponse.json(
          jsonRpcError(rpc.id, A2A_ERRORS.METHOD_NOT_FOUND),
        );
    }
  } catch (err: any) {
    console.error('[a2a-rpc] Error:', err.message);
    return NextResponse.json(
      jsonRpcError(0, { ...A2A_ERRORS.INTERNAL_ERROR, data: err.message }),
      { status: 500 },
    );
  }
}

// ── sendMessage ────────────────────────────────────────────

async function handleSendMessage(rpc: JsonRpcRequest, req: Request) {
  const params = rpc.params as any;

  if (!params?.message?.parts?.length) {
    return NextResponse.json(
      jsonRpcError(rpc.id, { ...A2A_ERRORS.INVALID_PARAMS, data: 'message.parts required' }),
    );
  }

  // Extract text from message parts
  const message = params.message as A2AMessage;
  const textParts = message.parts.filter((p): p is A2ATextPart => p.type === 'text');
  const dataParts = message.parts.filter((p): p is A2ADataPart => p.type === 'data');

  const prompt = textParts.map(p => p.text).join('\n');
  if (!prompt.trim()) {
    return NextResponse.json(
      jsonRpcError(rpc.id, { ...A2A_ERRORS.INVALID_PARAMS, data: 'No text content in message' }),
    );
  }

  // Extract optional config
  const config = params.configuration || {};
  const agentId = config.agentId || params.metadata?.agentId;
  const budget = config.budget || dataParts[0]?.data?.budget;
  const callerWallet = config.callerWallet
    || req.headers.get('x-wallet-address')
    || '0x0000000000000000000000000000000000000000';

  // Create A2A task
  const taskId = `a2a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const task: A2ATask = {
    id: taskId,
    contextId: params.contextId || config.contextId,
    status: {
      state: 'submitted',
      timestamp: new Date().toISOString(),
    },
    messages: [message],
    metadata: {
      agentId,
      budget,
      callerWallet,
      source: 'a2a-protocol',
    },
  };

  setTask(task);

  // If specific agent requested, execute directly
  if (agentId) {
    return executeAgentTask(rpc.id, task, agentId, prompt, budget, callerWallet);
  }

  // Otherwise, discover best agent first
  return discoverAndExecute(rpc.id, task, prompt, budget, callerWallet);
}

// ── Execute specific agent ─────────────────────────────────

async function executeAgentTask(
  rpcId: string | number,
  task: A2ATask,
  agentId: string,
  prompt: string,
  budget: number | undefined,
  callerWallet: string,
) {
  // Update task to working
  task.status = { state: 'working', timestamp: new Date().toISOString() };
  setTask(task);

  try {
    // Call native agent service directly
    const response = await fetch(`${AGENT_SERVICE}/agents/${agentId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: task.id,
        prompt,
        callerWallet,
        budget,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({ error: response.statusText }));
      task.status = {
        state: 'failed',
        message: { role: 'agent', parts: [{ type: 'text', text: errBody.error || 'Agent execution failed' }] },
        timestamp: new Date().toISOString(),
      };
      setTask(task);
      return NextResponse.json(jsonRpcSuccess(rpcId, task));
    }

    const result = await response.json();

    // Check for error in response body (HTTP 200 but status: error)
    if (result.status === 'error') {
      task.status = {
        state: 'failed',
        message: { role: 'agent', parts: [{ type: 'text', text: result.error || 'Agent returned error' }] },
        timestamp: new Date().toISOString(),
      };
      task.messages?.push({ role: 'agent', parts: [{ type: 'text', text: result.error }] });
      setTask(task);
      return NextResponse.json(jsonRpcSuccess(rpcId, task));
    }

    // Success — build A2A response
    task.status = {
      state: 'completed',
      message: { role: 'agent', parts: [{ type: 'text', text: `Agent ${agentId} completed successfully.` }] },
      timestamp: new Date().toISOString(),
    };

    task.artifacts = [{
      name: `${agentId}-result`,
      description: `Execution result from ${agentId}`,
      parts: [
        { type: 'data', data: result.result || result },
      ],
      metadata: {
        executionTimeMs: result.executionTimeMs,
        agentId: result.agentId,
        onChain: result.result?.onChain || false,
      },
    }];

    task.messages?.push({
      role: 'agent',
      parts: [
        { type: 'text', text: `Task completed by ${agentId} in ${result.executionTimeMs}ms.` },
        { type: 'data', data: result.result || {} },
      ],
    });

    task._paypol = {
      jobId: result.jobId,
      agentId: result.agentId,
    };

    setTask(task);
    return NextResponse.json(jsonRpcSuccess(rpcId, task));

  } catch (err: any) {
    task.status = {
      state: 'failed',
      message: { role: 'agent', parts: [{ type: 'text', text: `Execution error: ${err.message}` }] },
      timestamp: new Date().toISOString(),
    };
    setTask(task);
    return NextResponse.json(jsonRpcSuccess(rpcId, task));
  }
}

// ── Discover best agent then execute ───────────────────────

async function discoverAndExecute(
  rpcId: string | number,
  task: A2ATask,
  prompt: string,
  budget: number | undefined,
  callerWallet: string,
) {
  try {
    // Fetch agent list from service
    const agentsRes = await fetch(`${AGENT_SERVICE}/agents`);
    if (!agentsRes.ok) throw new Error('Failed to fetch agents');
    const agents = await agentsRes.json();

    // Simple keyword matching (same pattern as discover/route.ts)
    const promptTokens = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2);

    const scored = agents.map((agent: any) => {
      const searchText = [agent.id, agent.name, agent.description, agent.category, ...(agent.capabilities || [])].join(' ').toLowerCase();
      let score = 0;
      for (const token of promptTokens) {
        if (searchText.includes(token)) score += 10;
      }
      return { agentId: agent.id, score };
    });

    scored.sort((a: any, b: any) => b.score - a.score);
    const bestAgent = scored[0];

    if (!bestAgent || bestAgent.score === 0) {
      task.status = {
        state: 'rejected',
        message: { role: 'agent', parts: [{ type: 'text', text: 'No suitable agent found for this task.' }] },
        timestamp: new Date().toISOString(),
      };
      setTask(task);
      return NextResponse.json(jsonRpcSuccess(rpcId, task));
    }

    return executeAgentTask(rpcId, task, bestAgent.agentId, prompt, budget, callerWallet);

  } catch (err: any) {
    task.status = {
      state: 'failed',
      message: { role: 'agent', parts: [{ type: 'text', text: `Discovery error: ${err.message}` }] },
      timestamp: new Date().toISOString(),
    };
    setTask(task);
    return NextResponse.json(jsonRpcSuccess(rpcId, task));
  }
}

// ── getTask ────────────────────────────────────────────────

async function handleGetTask(rpc: JsonRpcRequest) {
  const params = rpc.params as any;
  const taskId = params?.id;

  if (!taskId) {
    return NextResponse.json(
      jsonRpcError(rpc.id, { ...A2A_ERRORS.INVALID_PARAMS, data: 'Task id required' }),
    );
  }

  const task = getTask(taskId);
  if (!task) {
    return NextResponse.json(
      jsonRpcError(rpc.id, A2A_ERRORS.TASK_NOT_FOUND),
    );
  }

  // Optionally trim history
  const historyLength = params?.historyLength;
  if (historyLength != null && task.messages) {
    task.messages = task.messages.slice(-historyLength);
  }

  return NextResponse.json(jsonRpcSuccess(rpc.id, task));
}

// ── listTasks ──────────────────────────────────────────────

async function handleListTasks(rpc: JsonRpcRequest) {
  const params = rpc.params as any;
  const contextId = params?.contextId;
  const status = params?.status;
  const pageSize = Math.min(params?.pageSize || 20, 100);

  const tasks = listTasks(contextId, status).slice(0, pageSize);

  return NextResponse.json(jsonRpcSuccess(rpc.id, {
    tasks,
    totalSize: tasks.length,
  }));
}

// ── cancelTask ─────────────────────────────────────────────

async function handleCancelTask(rpc: JsonRpcRequest) {
  const params = rpc.params as any;
  const taskId = params?.id;

  if (!taskId) {
    return NextResponse.json(
      jsonRpcError(rpc.id, { ...A2A_ERRORS.INVALID_PARAMS, data: 'Task id required' }),
    );
  }

  const task = getTask(taskId);
  if (!task) {
    return NextResponse.json(
      jsonRpcError(rpc.id, A2A_ERRORS.TASK_NOT_FOUND),
    );
  }

  // Can only cancel non-terminal tasks
  if (['completed', 'failed', 'canceled', 'rejected'].includes(task.status.state)) {
    return NextResponse.json(
      jsonRpcError(rpc.id, A2A_ERRORS.TASK_NOT_CANCELABLE),
    );
  }

  task.status = {
    state: 'canceled',
    message: { role: 'agent', parts: [{ type: 'text', text: 'Task canceled by client.' }] },
    timestamp: new Date().toISOString(),
  };
  setTask(task);

  return NextResponse.json(jsonRpcSuccess(rpc.id, task));
}

// ── CORS ───────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Wallet-Address',
    },
  });
}
