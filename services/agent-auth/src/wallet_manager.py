import json
import os
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- CONFIGURATION ---
DEFAULT_TOKEN = "0x20c0000000000000000000000000000000000001"
PAYMENT_TOKEN_ADDRESS = os.getenv("PAYMENT_TOKEN_ADDRESS", DEFAULT_TOKEN)

try:
    PAYMENT_TOKEN_ADDRESS = Web3.to_checksum_address(PAYMENT_TOKEN_ADDRESS)
except:
    pass 

ERC20_ABI = [
    {"constant": False, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"}
]

class WalletManager:
    def __init__(self):
        self.rpc_url = os.getenv("RPC_URL")
        self.wallet_address = os.getenv("SMART_WALLET_ADDRESS")
        self.agent_address = os.getenv("AGENT_ADDRESS")
        self.agent_private_key = os.getenv("AGENT_PRIVATE_KEY")
        
        # Connect to Blockchain
        self.web3 = Web3(Web3.HTTPProvider(self.rpc_url))
        if not self.web3.is_connected():
            raise ConnectionError("Cannot connect to Blockchain")
            
        if self.wallet_address:
            self.wallet_address = Web3.to_checksum_address(self.wallet_address)
            
        self.contract = self._load_contract()
        self.token_contract = self.web3.eth.contract(address=PAYMENT_TOKEN_ADDRESS, abi=ERC20_ABI)
        
        # Auto-detect Decimals
        try:
            self.token_decimals = self.token_contract.functions.decimals().call()
        except Exception as e:
            print(f"⚠️ Warning: Could not detect decimals. Defaulting to 18. Error: {e}")
            self.token_decimals = 18

    def _load_contract(self):
        """
        Loads the Smart Contract instance using a minimal hardcoded ABI.
        This completely prevents 'Stale ABI' or 'File Not Found' errors.
        """
        minimal_abi = [
            # Event
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "internalType": "address", "name": "target", "type": "address"},
                    {"indexed": False, "internalType": "uint256", "name": "value", "type": "uint256"},
                    {"indexed": False, "internalType": "bytes", "name": "data", "type": "bytes"}
                ],
                "name": "Executed",
                "type": "event"
            },
            # execute function
            {
                "inputs": [
                    {"internalType": "address", "name": "target", "type": "address"},
                    {"internalType": "uint256", "name": "value", "type": "uint256"},
                    {"internalType": "bytes", "name": "data", "type": "bytes"}
                ],
                "name": "execute",
                "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            # executeBatch function (The missing piece!)
            {
                "inputs": [
                    {"internalType": "address[]", "name": "targets", "type": "address[]"},
                    {"internalType": "uint256[]", "name": "values", "type": "uint256[]"},
                    {"internalType": "bytes[]", "name": "datas", "type": "bytes[]"}
                ],
                "name": "executeBatch",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
        
        return self.web3.eth.contract(address=self.wallet_address, abi=minimal_abi)

    def get_wallet_balance(self):
        try:
            raw = self.token_contract.functions.balanceOf(self.wallet_address).call()
            return raw / (10 ** self.token_decimals)
        except: return 0.0

    def execute_payment(self, receiver_address, amount):
        """Single payment (Kept for backward compatibility)"""
        try:
            receiver_address = Web3.to_checksum_address(receiver_address)
            amount_units = int(amount * (10 ** self.token_decimals))
            transfer_data = self.token_contract.functions.transfer(receiver_address, amount_units)._encode_transaction_data()
            
            function_call = self.contract.functions.execute(
                PAYMENT_TOKEN_ADDRESS, 0, transfer_data          
            ).build_transaction({
                'from': self.agent_address,
                'nonce': self.web3.eth.get_transaction_count(self.agent_address),
                'gas': 500000,
                'gasPrice': self.web3.eth.gas_price,
                'chainId': self.web3.eth.chain_id 
            })
            
            signed_tx = self.web3.eth.account.sign_transaction(function_call, self.agent_private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
            receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1: return self.web3.to_hex(tx_hash)
            else: return None
        except Exception as e:
            print(f"❌ Error: {e}")
            return None

    def execute_batch_payment(self, recipients_dict):
        """
        Executes multiple payments in ONE transaction.
        recipients_dict format: {'0xAddress1': 0.05, '0xAddress2': 0.07}
        """
        try:
            targets = []
            values = []
            datas = []
            
            print(f"🚀 Preparing Batch Payment for {len(recipients_dict)} employees...")

            for receiver, amount in recipients_dict.items():
                receiver = Web3.to_checksum_address(receiver)
                amount_units = int(amount * (10 ** self.token_decimals))
                
                # Target is the Token Contract
                targets.append(PAYMENT_TOKEN_ADDRESS)
                
                # Native value sent is 0
                values.append(0)
                
                # Encoded ERC-20 transfer data
                transfer_data = self.token_contract.functions.transfer(
                    receiver, amount_units
                )._encode_transaction_data()
                datas.append(transfer_data)

            # Build the Batch Transaction
            function_call = self.contract.functions.executeBatch(
                targets, values, datas
            ).build_transaction({
                'from': self.agent_address,
                'nonce': self.web3.eth.get_transaction_count(self.agent_address),
                'gas': 1500000, # Higher gas limit for batch processing
                'gasPrice': self.web3.eth.gas_price,
                'chainId': self.web3.eth.chain_id 
            })
            
            signed_tx = self.web3.eth.account.sign_transaction(function_call, self.agent_private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                return self.web3.to_hex(tx_hash)
            else:
                print("❌ Batch Payment Failed on Blockchain (Status 0)")
                return None

        except Exception as e:
            print(f"❌ Error in Batch Payment: {e}")
            return None

    def get_transaction_history(self):
        """Fetches recent history (last 50k blocks)."""
        try:
            current_block = self.web3.eth.block_number
            start_block = max(0, current_block - 50000)
            
            events = self.contract.events.Executed.get_logs(from_block=start_block)
            history = []
            
            for e in events:
                tx_hash = e.transactionHash.hex()
                target = e.args.target
                value_native = e.args.value
                data = e.args.data
                
                is_token_transfer = (target.lower() == PAYMENT_TOKEN_ADDRESS.lower())
                
                display_receiver = target
                display_amount = f"{self.web3.from_wei(value_native, 'ether')} Native"
                
                if is_token_transfer:
                    try:
                        if len(data) >= 68: 
                            receiver_hex = data[4:36].hex() 
                            display_receiver = Web3.to_checksum_address("0x" + receiver_hex[-40:])
                            amount_hex = data[36:68].hex()
                            raw_amount = int(amount_hex, 16)
                            real_amount = raw_amount / (10 ** self.token_decimals)
                            display_amount = f"{real_amount:.4f} Token"
                    except Exception as decode_err:
                        display_amount = "Unknown Token Amt"

                history.append({
                    "tx_hash": tx_hash,
                    "receiver": display_receiver,
                    "amount_eth": display_amount, 
                    "block_number": e.blockNumber
                })
            
            return history[::-1]
            
        except Exception as e:
            print(f"❌ Error fetching history: {e}")
            return []