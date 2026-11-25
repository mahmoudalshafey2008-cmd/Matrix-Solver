from flask import Flask, request, jsonify, send_from_directory
from matrix_solver import solve, MAX

app = Flask(__name__, static_folder=".", static_url_path="")


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/api/config", methods=["GET"])
def api_config():
    return jsonify({"max_variables": MAX})


@app.route("/api/solve", methods=["POST"])
def api_solve():
    # Parse incoming JSON body from the browser
    data = request.get_json(silent=True) or {}
    raw_matrix = data.get("matrix")
    method = data.get("method", "gauss")
    # Read the explicit variable count sent by the frontend (defaults to None if omitted)
    num_vars = data.get("num_vars")

    if not isinstance(raw_matrix, list):
        return jsonify({"error": "Invalid matrix payload."}), 400

    try:
        # Forward num_vars so rectangular matrices (e.g., 2 equations x 3 variables) are validated properly
        result = solve(raw_matrix, method, num_vars=num_vars)
        # Convert Fraction objects in the solution list to strings so Flask can serialize them to JSON
        serialized_solution = (
            [str(val) for val in result["solution"]]
            if result["solution"] is not None
            else None
        )
        return jsonify({
            "outcome": result["outcome"],
            "steps": result["steps"],
            "solution": serialized_solution,
        })
    except ValueError as err:
        return jsonify({"error": str(err)}), 400


if __name__ == "__main__":
    app.run(debug=True, port=5000)