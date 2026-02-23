import sqlite3

def reset_status():
    print("🔄 Resetting database...")
    # Connect to the database in the same root folder
    conn = sqlite3.connect('payroll.db')
    cursor = conn.cursor()
    
    # Update everyone back to Pending
    cursor.execute("UPDATE employees SET status = 'Pending'")
    conn.commit()
    conn.close()
    
    print("✅ All employees are now back to 'Pending' status!")

if __name__ == "__main__":
    reset_status()