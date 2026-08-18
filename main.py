print("Welcome to Expenses Tracker")
expenses = []
categories = [
    "Food",
    "Travel",
    "Shopping",
    "Bills",
    "Entertainment",
    "Education",
    "Health",
    "Others"
]

while True:
    print("\n===== MENU =====")
    print("1. Add Expense")
    print("2. View Expenses")
    print("3. Delete Expense")
    print("4. Monthly Summary")
    print("5. Exit")

    choice = input("Enter your choice: ")
    if choice == "1":
        amount = int(input("Enter amount: "))

        print("\nSelect Category:")
        for i in range(len(categories)):
            print(i + 1, ".", categories[i])

        category_choice = int(input("Enter category number: "))
        category = categories[category_choice - 1]

        note = input("Enter note: ")

        expense = {
            "id": len(expenses) + 1,
            "amount": amount,
            "category": category,
            "note": note
        }

        expenses.append(expense)

        print("Expense added successfully!")
    elif choice == "5":
        print("Thank you for using Expense Tracker!")
        break
    
    