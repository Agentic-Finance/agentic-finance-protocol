import sys
import os

# --- 1. PATH CONFIGURATION (MUST BE AT THE VERY TOP) ---
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)


# --- 2. IMPORTS (AFTER PATH CONFIG) ---
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Local modules
from wallet_manager import WalletManager
from database import init_db, add_employee, get_all_employees  # <--- PLACE IT HERE

# Initialize Database on startup
init_db()


# 1. Initialize the App and Wallet Manager
app = FastAPI(title="PayPol Agent API", version="1.0")

try:
    # Initialize the "Brain" once when server starts
    manager = WalletManager()
    print("✅ WalletManager loaded successfully in API.")
except Exception as e:
    print(f"❌ Critical Error loading WalletManager: {e}")

# 2. Define Data Models
class PaymentRequest(BaseModel):
    receiver_address: str
    amount_eth: float


class EmployeeRequest(BaseModel):
    name: str
    wallet_address: str
    salary_eth: float
    role: str = "Staff"

# 3. Define API Endpoints

@app.get("/")
def home():
    """Health check endpoint."""
    return {"status": "running", "service": "PayPol Agent Auth"}

@app.get("/balance")
def get_balance():
    """Returns the current balance of the Agent Smart Wallet."""
    try:
        balance = manager.get_wallet_balance()
        return {
            "wallet_address": manager.wallet_address,
            "balance_eth": balance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/pay")
def process_payment(request: PaymentRequest):
    """
    Triggers the Agent to execute a payment on Blockchain.
    """
    try:
        if request.amount_eth <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
            
        tx_hash = manager.execute_payment(request.receiver_address, request.amount_eth)
        
        if tx_hash:
            return {
                "status": "success", 
                "message": "Payment executed successfully",
                "transaction_hash": tx_hash,
                "amount_sent": request.amount_eth
            }
        else:
            raise HTTPException(status_code=500, detail="Transaction failed on Blockchain")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
def get_history():
    """Returns the list of past transactions."""
    return manager.get_transaction_history()


# --- HR MANAGEMENT ENDPOINTS ---

@app.get("/employees")
def list_employees():
    """Returns the list of all employees in the database."""
    return get_all_employees()

@app.post("/employees")
def create_employee(emp: EmployeeRequest):
    """Adds a new employee to the payroll."""
    try:
        add_employee(emp.name, emp.wallet_address, emp.salary_eth, emp.role)
        return {"status": "success", "message": f"Added employee: {emp.name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))