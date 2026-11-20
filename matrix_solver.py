#fractions stores numbers exactly (1/3 stays 1/3) so we avoid float rounding errors
import fractions
#maximum number of rows (and variables) the solver accepts
MAX = 10
#validates the raw input and returns a new matrix of Fractions
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
a = [["no",2]]
print (prepare_matrix(a))