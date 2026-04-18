// A* Pathfinding Algorithm for Automatic Wire Routing

class Node {
    constructor(x, y) {
        this.x = x;  // Node's x coordinate
        this.y = y;  // Node's y coordinate
        this.g = 0;  // Cost from start node to current node
        this.h = 0;  // Heuristic cost from current node to goal
        this.f = 0;  // Total cost (g + h)
        this.parent = null;  // Parent node
    }
}

function heuristic(a, b) {
    // Using Manhattan distance as the heuristic
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(node, grid) {
    // Get valid neighbors (considering obstacles)
    const neighbors = [];
    const directions = [
        { dx: 0, dy: 1 },   // Up
        { dx: 1, dy: 0 },   // Right
        { dx: 0, dy: -1 },  // Down
        { dx: -1, dy: 0 }   // Left
    ];

    for (const dir of directions) {
        const neighborX = node.x + dir.dx;
        const neighborY = node.y + dir.dy;
        if (grid[neighborY] && grid[neighborY][neighborX] !== 1) {
            neighbors.push(new Node(neighborX, neighborY));
        }
    }

    return neighbors;
}

function aStar(start, goal, grid) {
    const openSet = [start];
    const closedSet = [];

    while (openSet.length > 0) {
        // Sort open set to find the node with the lowest f
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();

        if (current.x === goal.x && current.y === goal.y) {
            // Reconstruct the path
            const path = [];
            let temp = current;
            while (temp) {
                path.push(temp);
                temp = temp.parent;
            }
            return path.reverse(); // Return reversed path
        }

        closedSet.push(current);

        const neighbors = getNeighbors(current, grid);
        for (const neighbor of neighbors) {
            if (closedSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) continue; // Ignore the neighbor which is already evaluated
            const tentative_g = current.g + 1;

            if (!openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
                openSet.push(neighbor);  // Add to open set
            } else if (tentative_g >= neighbor.g) {
                continue;  // This is not a better path
            }

            // Update neighbor values
            neighbor.parent = current;
            neighbor.g = tentative_g;
            neighbor.h = heuristic(neighbor, goal);
            neighbor.f = neighbor.g + neighbor.h;
        }
    }

    return [];  // No path found
}

// Example usage: grid = [  // 0 = free, 1 = obstacle
//   [0, 0, 0, 0, 0],
//   [0, 1, 1, 0, 0],
//   [0, 0, 0, 0, 0],
// ];
// const start = new Node(0, 0);
// const goal = new Node(4, 2);
// const path = aStar(start, goal, grid);
// console.log(path);
