import sqlite3
import os

# Ensure this path perfectly matches the one in salary_bot.py
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../payroll.db"))

def setup_database():
    print(f"🚀 Initializing Database at: {DB_PATH}")
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create the 'employees' table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            wallet_address TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            tx_hash TEXT
        )
    ''')

    # 2. Clear old test data (optional, to keep it clean)
    cursor.execute("DELETE FROM employees")

    # 3. Insert sample data (Alice and Son)
    # Note: Replace these wallet addresses with the actual ones you want to test
    sample_employees = [
        ('Alice Developer', '0x7D92674E740D19C3771293f173d05Ad6FF0FBe5C', 0.05, 'Pending'),
        ('Sam', '0x1aa868CDA63882F0705Fb7A50B2eE787da28eE69', 0.07, 'Pending')
    ]

    cursor.executemany('''
        INSERT INTO employees (name, wallet_address, amount, status)
        VALUES (?, ?, ?, ?)
    ''', sample_employees)

    conn.commit()
    conn.close()
    
    print("✅ Database setup complete!")
    print("👥 Added 2 employees with 'Pending' status.")

if __name__ == "__main__":
    setup_database()