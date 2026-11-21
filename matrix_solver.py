#fractions stores numbers exactly (1/3 stays 1/3) so we avoid float rounding errors
import fractions
#maximum number of rows (and variables) the solver accepts
MAX = 10
#function checks the raw input and returns a new matrix of Fractions
def prepare_matrix(raw_matrix):
    length = len(raw_matrix)
    #the number of rows must be between 1 and MAX (10)
    if length < 1 or length > MAX:
        raise ValueError("invalid matrix: it must have between 1 and 10 rows")
    #each row needs length + 1 elements to be an augmented matrix
    for row in range(length):
        if len(raw_matrix[row]) != length + 1:
            raise ValueError("invalid matrix: row " + str(row + 1) + " must have " + str(length + 1) + " entries")
    #new list so raw_matrix stays untouched
    new_matrix = []
    for row in range(length):
        new_row = []
        for column in range(length + 1):
            try:
                new_row.append(fractions.Fraction(raw_matrix[row][column]))
            #not a number (like "matrix") or a fraction with zero division (like "1/0")
            except (ValueError, ZeroDivisionError):
                raise ValueError("row " + str(row + 1) + ", column " + str(column + 1) + " is not a valid number")
        new_matrix.append(new_row)
    #the finished matrix goes back so other functions can use it
    return new_matrix

#function draws the matrix in a neat manner like in pen and paper
#it will take in matrix (list of lists) and make a string copy of it
#the copy will have the same look as if we drew it in paper
def draw_matrix(matrix):
    #we extract the number of rows from the matrix
    rows = len(matrix)
    #we extract the number of columns from the matrix by taking the length of any single element in matrix ([0] in this case)
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
            if column == columns-2:
                #if coefficient part is over (column == columns-2) then the next element is the constant
                #so we add | to seperate them if the statment is successful
                line = line + "|"
            # else if the element is a coeficient
            elif column < columns-2:
                #if the element is coeficient (column < columns-2)
                #then we add 2 spaces ("  ") to the line string to put space between elements like in paper
                line = line + "  "
        #after we loop through all the columns in a row we finally close the line    
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
    if const == 1:
        number = ""
    #lastly like all other primary row functions we append to steps list
    steps.append("R" + str(target_row+1) + sign + number + "R" + str(source_row+1) + " ==> R" + str(target_row+1) + "\n" + draw_matrix(matrix))

#test block (temp)
if __name__ == "__main__":
    steps = []
    m = prepare_matrix([[1, 2, 5], [3, 4, 6]])
    row_addition(m, 1, 0, -3, steps)
    row_multiply(m, 0, 3, steps)
    row_switch(m, 0, 1, steps)
    for s in steps:
        print(s)

