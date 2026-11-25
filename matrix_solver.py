#fractions stores numbers exactly (1/3 stays 1/3) so we avoid float rounding errors
import fractions


#maximum number of rows (and variables) the solver accepts
MAX = 10


#function checks the raw input and returns a new matrix of Fractions
# Accepts an optional num_vars parameter so the number of variables can differ from the number of equations (rows)
def prepare_matrix(raw_matrix, num_vars=None):
    # Count how many equations (rows) were passed in
    num_rows = len(raw_matrix)
    # Validate that the row count is within the allowed range (1 to MAX)
    if num_rows < 1 or num_rows > MAX:
        raise ValueError(f"invalid matrix: rows must be between 1 and {MAX}")

    # If the caller did not explicitly pass num_vars, infer it from the first row
    # (total columns minus 1, because the last column is the constant b)
    if num_vars is None:
        if len(raw_matrix[0]) < 2:
            raise ValueError("invalid matrix: must have at least 1 variable and 1 constant")
        num_vars = len(raw_matrix[0]) - 1

    # Validate that the variable count is also within 1 to MAX
    if num_vars < 1 or num_vars > MAX:
        raise ValueError(f"invalid matrix: variables must be between 1 and {MAX}")

    # Every row in an augmented matrix must have num_vars coefficients + 1 constant column
    expected_cols = num_vars + 1
    for row in range(num_rows):
        if len(raw_matrix[row]) != expected_cols:
            raise ValueError(
                f"invalid matrix: row {row + 1} must have {expected_cols} entries ({num_vars} coefficients + 1 constant)"
            )

    # Create a brand-new matrix of exact Fraction objects so raw_matrix is not modified
    new_matrix = []
    for row in range(num_rows):
        new_row = []
        # Loop over all expected columns (coefficients + constant) instead of length + 1
        for col in range(expected_cols):
            try:
                new_row.append(fractions.Fraction(raw_matrix[row][col]))
            except (ValueError, ZeroDivisionError):
                raise ValueError(f"row {row + 1}, column {col + 1} is not a valid number")
        new_matrix.append(new_row)

    return new_matrix



#function draws the matrix in a neat manner like in pen and paper
#it will take in matrix (list of lists) and make a string copy of it
#the copy will have the same look as if we drew it in paper
def draw_matrix(matrix):
    rows = len(matrix)
    #we extract the number of columns from the matrix
    columns = len(matrix[0])
    #type string that will have the elements of the matrix put into
    drawing = ""
    #we make a nested loop that will draw the matrix row by row
    for row in range(rows):
        #line string variable will hold the rows one by one
        line = "["
        #now loop over each element of a row
        for column in range(columns):
            line = line + str(matrix[row][column]) 
            #condition that will check if the coefficient part is over
            #meaning the next element is the constant
            if column == columns-2:
                #so we add | to seperate them if the statment is successful
                line = line + "|"
            # else if the element is a coefficient we don't use "|"
            elif column < columns-2:
                # we add 2 spaces ("  ") to the line string instead
                line = line + "  "
        #we close the line after loop   
        line = line + "]"
        #we add the line (row) to the drawing string
        drawing = drawing + line
        if row < rows-1:
            #if the row isn't the last row of the matrix then start a newline
            drawing = drawing + "\n"
    # at the end we return the drawn matrix
    return drawing
#note on the draw function: "the output is correct but the rows are uneven in case of fractions or not all elements being of the same power of ten (all elements of the matrix being the same digit like all being single or double digit)"



#these are some primary operation functions
#each function has a "steps" parameter which is a list that will mainly store strings
#each function will append to the steps list what they've done
#this is to achieve a step by step output when solving a matrix



#function switches 2 rows of a matrix
def row_switch(matrix, i, j, steps):
    #switch rows
    matrix[i], matrix[j] = matrix[j], matrix[i]
    #append the switch step with the edited matrix to steps
    steps.append("R" + str(i+1) + " and R" + str(j+1) + " switched\n" + draw_matrix(matrix))


#function multiplies a matrix row by a constant
def row_multiply(matrix, row, const, steps):
    for col in range (len(matrix[row])):
        matrix [row] [col] *= const
    #append to steps list with new matrix
    steps.append(str(const) + "R" + str(row+1) + " ==> R" + str(row+1) + "\n" + draw_matrix(matrix))



#function adds 2 rows, a target row  and a multiplicant of a source row
def row_addition(matrix, target_row, source_row, const, steps):
    #same as multiply but each element in target gets added with the element of source multiplied by a constant
    for col in range (len(matrix[target_row])):
        matrix[target_row][col] += const * matrix[source_row][col]
    #empty sign string to help with step visualization
    sign = ""
    if const < 0:
        #const is negative so sign is negative
        sign = "-"
        #number is a string that holds const and in this case -const
        #as to remove the "-" from const so in steps we don't get "R1 - -2R2", and instead be the intended "R1 - 2R2"
        number = str(-const)
    else:
        #const is positive so no edits needed just assign number to const and sign to +
        sign = "+"
        number = str(const)
    #small feature so if we don't multiply (multiply by 1) it doesn't show in steps
    #(R1 + 1R2 becomes R1 + R2)
    if const == 1 or const == -1:
        number = ""
    #lastly like all other primary row functions we append to steps list
    steps.append("R" + str(target_row+1) + sign + number + "R" + str(source_row+1) + " ==> R" + str(target_row+1) + "\n" + draw_matrix(matrix))



#function solves given matrix using Gauss elimination
def solve_Gauss(matrix, num_vars=None):
    # Separate row count (equations) from column count (variables)
    num_rows = len(matrix)
    if num_vars is None:
        num_vars = len(matrix[0]) - 1

    steps = ["Starting matrix\n" + draw_matrix(matrix)]
    pivot_row = 0

    # Iterate through each variable column (not len(matrix), because num_vars can be > num_rows)
    for pivot_col in range(num_vars):
        # Stop early if we have already placed a pivot in every available equation row
        if pivot_row >= num_rows:
            break

        # Search downward from pivot_row to num_rows for the first non-zero entry in this column
        found = -1
        for row in range(pivot_row, num_rows):
            if matrix[row][pivot_col] != 0:
                found = row
                break

        # If the entire column below pivot_row is zero, this variable is a free variable; skip to next column
        if found == -1:
            continue

        # Swap the row containing the non-zero entry up into the current pivot_row position
        if found != pivot_row:
            row_switch(matrix, pivot_row, found, steps)

        # Scale the pivot row so the leading pivot entry becomes 1
        if matrix[pivot_row][pivot_col] != 1:
            row_multiply(matrix, pivot_row, 1 / matrix[pivot_row][pivot_col], steps)

        # Eliminate all non-zero entries below the pivot in the current column
        for row in range(pivot_row + 1, num_rows):
            if matrix[row][pivot_col] != 0:
                row_addition(
                    matrix,
                    row,
                    pivot_row,
                    -matrix[row][pivot_col] / matrix[pivot_row][pivot_col],
                    steps,
                )

        # Advance to the next row for the next pivot
        pivot_row += 1

    # Check every equation row for a contradiction: all num_vars coefficients are 0, but constant != 0
    for row in range(num_rows):
        all_zero = all(matrix[row][col] == 0 for col in range(num_vars))
        if all_zero and matrix[row][-1] != 0:
            steps.append(f"R{row + 1} reads 0 = {matrix[row][-1]}, so there is no solution")
            return {"outcome": "none", "steps": steps, "solution": None}

    # If there are fewer equations than variables (underdetermined) or fewer pivots than variables,
    # at least one variable is free -> infinitely many solutions
    if num_rows < num_vars or pivot_row < num_vars:
        steps.append("fewer pivots than variables, so there are infinitely many solutions")
        return {"outcome": "infinite", "steps": steps, "solution": None}

    # Back-substitution only runs when we have a unique solution (pivot_row == num_vars)
    x = [0] * num_vars
    for row in range(num_vars - 1, -1, -1):
        total = matrix[row][-1]
        text = str(total)
        for col in range(row + 1, num_vars):
            total = total - matrix[row][col] * x[col]
            text = text + f" - ({matrix[row][col]} * {x[col]})"
        x[row] = total
        if row < num_vars - 1:
            text = text + f" = {x[row]}"
        steps.append(f"x{row + 1} = {text}")

    return {"outcome": "unique", "steps": steps, "solution": x}


#Gauss jordan function, this functions works like Gauss so i won't comment in it, i will highlight the diffirences when they come
def solve_Gauss_jordan(matrix, num_vars=None):
    # Track equations (num_rows) and variables (num_vars) independently
    num_rows = len(matrix)
    if num_vars is None:
        num_vars = len(matrix[0]) - 1

    steps = ["Starting matrix\n" + draw_matrix(matrix)]
    pivot_row = 0

    # Iterate across variable columns up to num_vars
    for pivot_col in range(num_vars):
        # Stop if every equation row already has a pivot
        if pivot_row >= num_rows:
            break

        # Find the first non-zero entry at or below pivot_row
        found = -1
        for row in range(pivot_row, num_rows):
            if matrix[row][pivot_col] != 0:
                found = row
                break

        # Skip free variable columns
        if found == -1:
            continue

        # Move pivot candidate into pivot_row
        if found != pivot_row:
            row_switch(matrix, pivot_row, found, steps)

        # Normalize pivot entry to 1
        if matrix[pivot_row][pivot_col] != 1:
            row_multiply(matrix, pivot_row, 1 / matrix[pivot_row][pivot_col], steps)

        # Eliminate entries both ABOVE and BELOW pivot_row across all num_rows
        for row in range(num_rows):
            if row != pivot_row and matrix[row][pivot_col] != 0:
                row_addition(
                    matrix,
                    row,
                    pivot_row,
                    -matrix[row][pivot_col] / matrix[pivot_row][pivot_col],
                    steps,
                )

        pivot_row += 1

    # Check for inconsistent equations (0 = non-zero constant)
    for row in range(num_rows):
        all_zero = all(matrix[row][col] == 0 for col in range(num_vars))
        if all_zero and matrix[row][-1] != 0:
            steps.append(f"R{row + 1} reads 0 = {matrix[row][-1]}, so there is no solution")
            return {"outcome": "none", "steps": steps, "solution": None}

    # Check for free variables when equations < variables or pivots < variables
    if num_rows < num_vars or pivot_row < num_vars:
        steps.append("fewer pivots than variables, so there are infinitely many solutions")
        return {"outcome": "infinite", "steps": steps, "solution": None}

    # Read off unique solution directly from the last column
    x = [0] * num_vars
    for row in range(num_vars - 1, -1, -1):
        total = matrix[row][-1]
        x[row] = total
        steps.append(f"x{row + 1} = {total}")

    return {"outcome": "unique", "steps": steps, "solution": x}


#solve function dictates what elimination we use
#just simple case statements we don't need to explain this part
# Pass num_vars through to prepare_matrix and the chosen elimination solver
def solve(raw_matrix, method, num_vars=None):
    matrix = prepare_matrix(raw_matrix, num_vars=num_vars)
    match method:
        case "gauss":
            return solve_Gauss(matrix, num_vars=num_vars)
        case "jordan":
            return solve_Gauss_jordan(matrix, num_vars=num_vars)
        case _:
            raise ValueError("unknown method")

#show result just takes in our solution and prints out the steps and the x values if the matrix has a unique solution
def show_result(result):
    for step in result["steps"]:
        print(step)
        print()
    if result["outcome"] == "unique":
        print("Solution:")
        for i in range(len(result["solution"])):
            print("x" + str(i + 1) + " = " + str(result["solution"][i]))


def main():
    #any wrong input raises a ValueError, which is caught at the bottom and printed
    try:
        n = int(input("Number of variables (1 to " + str(MAX) + "): "))
        if n < 1 or n > MAX:
            raise ValueError("the number must be between 1 and " + str(MAX))
        #read the rows, each one is a list of the numbers typed (split by spaces)
        raw = []
        for row in range(n):
            raw.append(input("Row " + str(row + 1) + ": ").split())
        choice = input("Method (1 = Gauss, 2 = Gauss-Jordan, 3 = both): ")
        if choice != "1" and choice != "2" and choice != "3":
            raise ValueError("method must be 1, 2 or 3")
        #solve builds a fresh matrix every call so both methods start from the same input
        if choice == "1" or choice == "3":
            print("\n=== Gaussian elimination ===\n")
            show_result(solve(raw, "gauss"))
        if choice == "2" or choice == "3":
            print("\n=== Gauss-Jordan elimination ===\n")
            show_result(solve(raw, "jordan"))
    except ValueError as error:
        print("error: " + str(error))


if __name__ == "__main__":
    main()
