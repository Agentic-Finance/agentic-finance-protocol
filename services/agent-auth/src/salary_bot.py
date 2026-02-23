import time
import sqlite3
import os
from web3 import Web3

# ==========================================
# 🤖 PAYPOL AGENTIC OS - DAEMON V3.1
# ==========================================

RPC_URL = "https://rpc.moderato.tempo.xyz"
AGENT_PRIVATE_KEY = "0x595f4a50a556c332910de723c710d1f6b654d3d86c9208498c876d147c8c4124"
CONTRACT_ADDRESS = "0x3F33B15B97F24b4c0Fe8c61d4d200e386bc2A885" 
TOKEN_ADDRESS = "0x20c0000000000000000000000000000000000001"
TOKEN_DECIMALS = 6
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../payroll.db'))

web3 = Web3(Web3.HTTPProvider(RPC_URL))
agent_address = web3.eth.account.from_key(AGENT_PRIVATE_KEY).address

VAULT_ABI = [
    {"inputs": [], "name": "isPaused", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"internalType": "address[]", "name": "targets", "type": "address[]"}, {"internalType": "uint256[]", "name": "values", "type": "uint256[]"}, {"internalType": "bytes[]", "name": "datas", "type": "bytes[]"}], "name": "proposeBatch", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "proposalCount", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}], "name": "cancelProposal", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}], "name": "executeProposal", "outputs": [], "stateMutability": "nonpayable", "type": "function"}
]

ERC20_ABI = [{"inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "transfer", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"}]

def get_contract():
    return web3.eth.contract(address=web3.to_checksum_address(CONTRACT_ADDRESS), abi=VAULT_ABI)

def handle_cancellations():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT proposal_id FROM employees WHERE status = 'Cancel_Requested'")
    rows = cursor.fetchall()
    
    if rows:
        print(f"\n[🚨 EMERGENCY OVERRIDE] Admin initiated abort sequence!")
        vault = get_contract()
        for row in rows:
            p_id = int(row['proposal_id'])
            try:
                tx = vault.functions.cancelProposal(p_id).build_transaction({'from': agent_address, 'nonce': web3.eth.get_transaction_count(agent_address), 'gasPrice': web3.eth.gas_price})
                signed = web3.eth.account.sign_transaction(tx, AGENT_PRIVATE_KEY)
                tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
                web3.eth.wait_for_transaction_receipt(tx_hash)
                
                cursor.execute("UPDATE employees SET status = 'Cancelled' WHERE proposal_id = ?", (p_id,))
                conn.commit()
                print(f"[✅ NEUTRALIZED] Proposal #{p_id} successfully aborted.")
            except Exception as e:
                print(f"[❌ ABORT FAILED] {e}")
    conn.close()

def execute_mature_vaults():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    current_time = int(time.time())
    
    cursor.execute("SELECT DISTINCT proposal_id FROM employees WHERE status = 'Vaulted' AND unlock_time <= ?", (current_time,))
    rows = cursor.fetchall()
    
    if rows:
        vault = get_contract()
        for row in rows:
            p_id = int(row['proposal_id'])
            print(f"\n[🔥 EXECUTION TIME] Unlocking funds for Proposal #{p_id}...")
            try:
                tx = vault.functions.executeProposal(p_id).build_transaction({'from': agent_address, 'nonce': web3.eth.get_transaction_count(agent_address), 'gasPrice': web3.eth.gas_price})
                signed = web3.eth.account.sign_transaction(tx, AGENT_PRIVATE_KEY)
                tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
                web3.eth.wait_for_transaction_receipt(tx_hash)
                
                cursor.execute("SELECT amount, token FROM employees WHERE proposal_id = ?", (p_id,))
                emps = cursor.fetchall()
                
                # FIXED: Rounding the float to prevent the 0.342999999999 bug
                total_amount = round(sum([float(e['amount']) for e in emps]), 3) 
                token_sym = emps[0]['token'] if emps else 'AlphaUSD'
                
                hex_hash = web3.to_hex(tx_hash)
                
                # FIXED: Updating 'trap_hash' to the final execution hash to link the UI breakdown
                cursor.execute("UPDATE employees SET status = 'Paid', trap_hash = ? WHERE proposal_id = ?", (hex_hash, p_id))
                cursor.execute("INSERT INTO payout_history (hash, amount, token, date) VALUES (?, ?, ?, ?)", 
                               (hex_hash, total_amount, token_sym, time.strftime('%H:%M:%S %d/%m/%Y')))
                conn.commit()
                print(f"[💸 FUNDS RELEASED] Final Hash: {hex_hash[:10]}...")
            except Exception as e:
                print(f"[❌ EXECUTION FAILED] {e}")
    conn.close()

def propose_new_tasks():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees WHERE status = 'Pending'")
    pending = cursor.fetchall()
    
    if not pending:
        conn.close()
        return

    vault = get_contract()
    token = web3.eth.contract(address=web3.to_checksum_address(TOKEN_ADDRESS), abi=ERC20_ABI)
    
    if vault.functions.isPaused().call({'block_identifier': 'latest'}):
        conn.close()
        return

    targets, values, datas, ids = [], [], [], []

    for emp in pending:
        ids.append(emp['id'])
        wallet = emp['wallet_address'] if 'wallet_address' in emp.keys() else emp['address']
        targets.append(web3.to_checksum_address(TOKEN_ADDRESS))
        values.append(0)
        datas.append(token.encode_abi("transfer", [web3.to_checksum_address(wallet), int(float(emp['amount']) * (10 ** TOKEN_DECIMALS))]))

    try:
        tx = vault.functions.proposeBatch(targets, values, datas).build_transaction({'from': agent_address, 'nonce': web3.eth.get_transaction_count(agent_address), 'gasPrice': web3.eth.gas_price})
        signed = web3.eth.account.sign_transaction(tx, AGENT_PRIVATE_KEY)
        tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)

        if receipt.status == 1:
            proposal_id = vault.functions.proposalCount().call() - 1
            unlock_time = int(time.time()) + (15 * 60) 
            placeholders = ','.join('?' * len(ids))
            cursor.execute(f"UPDATE employees SET status = 'Vaulted', proposal_id = ?, unlock_time = ? WHERE id IN ({placeholders})", 
                           [proposal_id, unlock_time] + ids)
            conn.commit()
            print(f"[🦞 TRAP SET] Proposal ID: {proposal_id}")
    except Exception as e:
        print(f"[💥 PROPOSAL FAILED] {e}")
    conn.close()

if __name__ == "__main__":
    print("=====================================================")
    print("🤖 PAYPOL OS - FULL LIFECYCLE DAEMON INITIALIZED")
    print("=====================================================")
    while True:
        handle_cancellations()
        execute_mature_vaults()
        propose_new_tasks()
        time.sleep(10)