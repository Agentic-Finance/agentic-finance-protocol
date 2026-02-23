from wallet_manager import WalletManager
import sys

def main():
    print("--- 🚀 PAYPOL AGENT SERVICE STARTED ---")
    
    try:
        # 1. Initialize the Manager
        manager = WalletManager()
        
        # 2. Check Initial Balance
        balance = manager.get_wallet_balance()
        print(f"💰 Current Smart Wallet Balance: {balance} ETH")
        
        # 3. Ask user for action (Simulation)
        # In a real app, this would come from an API request or Database trigger
        print("\n--- SIMULATING A PAYMENT REQUEST ---")
        receiver = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" # Account 2
        amount = 0.5
        
        print(f"❓ Request: Send {amount} ETH to {receiver}")
        confirm = input("👉 Do you want to proceed? (yes/no): ")
        
        if confirm.lower() == "yes":
            tx_hash = manager.execute_payment(receiver, amount)
            if tx_hash:
                new_balance = manager.get_wallet_balance()
                print(f"💰 New Wallet Balance: {new_balance} ETH")
        else:
            print("Payment cancelled by user.")

    except Exception as e:
        print(f"❌ Critical Error: {e}")

if __name__ == "__main__":
    main()