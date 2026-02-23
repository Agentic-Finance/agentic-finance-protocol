import streamlit as st
import requests
import pandas as pd

# Page Configuration
st.set_page_config(
    page_title="PayPol Admin Dashboard",
    page_icon="🏢",
    layout="wide" # Use wide mode for better tables
)

API_URL = "http://127.0.0.1:8001"

st.title("🏢 PayPol Protocol: Admin Dashboard")

# Check Backend Status
try:
    requests.get(f"{API_URL}/")
except:
    st.error("⚠️ Backend is OFFLINE. Please run: 'uvicorn src.api:app --port 8001'")
    st.stop()

# Create Tabs
tab1, tab2 = st.tabs(["💸 Wallet & Payments", "👥 Payroll Management"])

# ==========================================
# TAB 1: WALLET & TRANSACTIONS
# ==========================================
with tab1:
    st.header("💳 Wallet Overview")
    
    # 1. Wallet Balance
    col1, col2 = st.columns(2)
    try:
        res = requests.get(f"{API_URL}/balance")
        data = res.json()
        col1.metric("Current Balance", f"{data['balance_eth']} ETH")
        col2.info(f"**Address:** `{data['wallet_address']}`")
    except:
        st.warning("Could not fetch balance.")

    st.divider()

    # 2. Manual Transfer
    st.subheader("🚀 Manual Transfer")
    with st.form("pay_form"):
        c1, c2 = st.columns([3, 1])
        receiver = c1.text_input("Receiver Address", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")
        amount = c2.number_input("Amount (ETH)", 0.001, 10.0, 0.01)
        
        if st.form_submit_button("Send Money Now"):
            with st.spinner("Processing..."):
                try:
                    r = requests.post(f"{API_URL}/pay", json={"receiver_address": receiver, "amount_eth": amount})
                    if r.status_code == 200:
                        st.success(f"✅ Sent {amount} ETH!")
                        st.json(r.json())
                    else:
                        st.error(r.text)
                except Exception as e:
                    st.error(str(e))

    st.divider()

    # 3. History
    st.subheader("📜 Recent Transactions")
    if st.button("Refresh History"):
        st.rerun()
        
    try:
        hist = requests.get(f"{API_URL}/history").json()
        if hist:
            df = pd.DataFrame(hist)
            st.dataframe(df, use_container_width=True)
        else:
            st.info("No transactions found.")
    except:
        st.warning("Error loading history.")

# ==========================================
# TAB 2: PAYROLL MANAGEMENT (NEW!)
# ==========================================
with tab2:
    st.header("👥 Employee Directory")

    # 1. Add New Employee Form
    with st.expander("➕ Add New Employee", expanded=False):
        with st.form("add_emp"):
            e_name = st.text_input("Full Name", "Alice Developer")
            e_role = st.selectbox("Role", ["Frontend Dev", "Backend Dev", "Designer", "Manager"])
            e_addr = st.text_input("Wallet Address", "0x...")
            e_salary = st.number_input("Salary (ETH)", 0.001, 1.0, 0.05, step=0.001)
            
            if st.form_submit_button("Save Employee"):
                payload = {
                    "name": e_name,
                    "wallet_address": e_addr,
                    "salary_eth": e_salary,
                    "role": e_role
                }
                res = requests.post(f"{API_URL}/employees", json=payload)
                if res.status_code == 200:
                    st.success(f"✅ Added {e_name} successfully!")
                    st.rerun()
                else:
                    st.error(res.text)

    # 2. List Employees Table
    try:
        emps = requests.get(f"{API_URL}/employees").json()
        if emps:
            st.markdown(f"**Total Employees:** {len(emps)}")
            
            # Convert to DataFrame for better display
            df_emp = pd.DataFrame(emps)
            
            # Display nicely
            st.dataframe(
                df_emp,
                column_config={
                    "name": "Employee Name",
                    "role": "Position",
                    "salary_eth": st.column_config.NumberColumn("Salary (ETH)", format="%.4f"),
                    "wallet_address": "Wallet Address",
                    "id": "ID"
                },
                use_container_width=True,
                hide_index=True
            )
        else:
            st.info("No employees found. Add one above!")
            
    except Exception as e:
        st.error(f"Error fetching employees: {e}")