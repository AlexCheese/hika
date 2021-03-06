/**
 * Represents a 4-dimensional vector.
 * @class
 * @param {number} [x=0] - The x component.
 * @param {number} [y=0] - The y component.
 * @param {number} [z=0] - The z component.
 * @param {number} [w=0] - The w component.
 */
export class Vec {
	public x: number;
	public y: number;
	public z: number;
	public w: number;
	constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0) {
		this.x = isNaN(x) ? 0 : x;
		this.y = isNaN(y) ? 0 : y;
		this.z = isNaN(z) ? 0 : z;
		this.w = isNaN(w) ? 0 : w;
	}
	/**
	 * Sums two vectors.
	 * @param {Vec} v - The vector to add.
	 * @returns {Vec} The sum of this vector and the given vector.
	 */
	add(v: Vec): Vec {
		return new Vec(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
	}
	/**
	 * Creates a soft-copy of this vector.
	 * @returns {Vec} A new vector with the same components as this vector.
	 */
	clone(): Vec {
		return new Vec(this.x, this.y, this.z, this.w);
	}
	/**
	 * Tests if this vector is equal to another vector.
	 * @param {Vec} v - The vector to compare to.
	 * @returns {boolean} True if the vectors are equal, false otherwise.
	 */
	equals(v: Vec): boolean {
		return (
			this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w
		);
	}
	/**
	 * Multiplies this vector by a scalar.
	 * @param {number} s - The scalar to multiply by.
	 * @returns {Vec} The product of this vector and the scalar.
	 */
	scale(s: number): Vec {
		return new Vec(this.x * s, this.y * s, this.z * s, this.w * s);
	}

	/** Serializes the Vec into a string
	 * @param {Vec} vec
	 * @returns {string}
	 * @see deserialize
	 */
	static serialize(vec: Vec): string {
		return `${vec.x},${vec.y},${vec.z},${vec.w}`;
	}

	/** Deserializes a string into a Vec
	 * @param {string} str
	 * @returns {Vec}
	 * @see serialize
	 */
	static deserialize(str: string): Vec {
		let [x, y, z, w] = str.split(",").map(Number);
		return new Vec(x, y, z, w);
	}

	/**
	 * Converts the Vec into a human-readable string.
	 * @returns {string} A string representation of the Vec.
	 * @example
	 * new Vec(1, 2, 3, 4).toString() // returns "b3d5"
	 */
	toString(): string {
		function toLetters(n: number): string {
			let mod = n % 26;
			let pow = (n - mod) / 26;
			let out = String.fromCharCode(97 + mod);
			if (pow > 0) out = toLetters(pow - 1) + out;
			return out;
		}
		return (
			toLetters(this.x) + (this.y + 1) + toLetters(this.z) + (this.w + 1)
		);
	}
}

export type Piece = {
	id: string;
	team: number;
	flags: number[];
};

type Condition = {
	inverted?: boolean;
	team?: number;
	flag?: number;
	piece?: Vec;
	enemy?: Vec;
};

type Path = {
	repeat?: number;
	condition?: Condition[];
	attack?: number;
	direction?: Vec;
	branches?: (string | Path)[];
};

type PieceRule = {
	pathTree: Path[];
};

/**
 * Represents a move from one place to another.
 * @class
 * @param {Vec} src - The source position.
 * @param {Vec} dst - The destination position.
 * @param {number} [int]
 */
export class Move {
	src: Vec;
	dst: Vec;
	int?: Vec[];
	constructor(src: Vec, dst: Vec, int?: Vec[]) {
		this.src = src;
		this.dst = dst;
		this.int = int;
	}
	equals(move: Move): boolean {
		return this.src.equals(move.src) && this.dst.equals(move.dst);
	}
	/**
	 * Serializes the move into a string
	 * @param {Move} mov
	 * @returns {string}
	 * @see deserialize
	 */
	static serialize(mov: Move): string {
		let int = "";
		if (mov.int != null) int = `/${mov.int.map(Vec.serialize).join("/")}`;
		return `${Vec.serialize(mov.src)}/${Vec.serialize(mov.dst)}${int}`;
	}
	/**
	 * Deserializes a move from a string.
	 * @param {string} str
	 * @returns {Move}
	 * @see serialize
	 */
	static deserialize(str: string): Move {
		let arr = str.split("/");
		if (arr.length === 2)
			return new Move(Vec.deserialize(arr[0]), Vec.deserialize(arr[1]));
		else
			return new Move(
				Vec.deserialize(arr[0]),
				Vec.deserialize(arr[1]),
				arr.slice(2).map(Vec.deserialize)
			);
	}
}

export type PieceVec = {
	piece: Piece;
	pos: Vec;
};

/**
 * The main class for the library.
 * @class
 * @param {string} [input = "8,8,1,1 RNBQKBNR,PPPPPPPP,8,8,8,8,pppppppp,rnbqkbnr"] - The input string for the board's initial state.
 */
export class Game {
	private readonly size: Vec;
	private layout: (Piece | null)[][][][] = [];
	private pois: PieceVec[] = [];
	private pieceDict: Map<string, PieceRule> = new Map<string, PieceRule>();
	private cache: Map<string, Move[]> = new Map<string, Move[]>();

	constructor(
		input: string = "8,8,1,1 RNBQKBNR,PPPPPPPP,8,8,8,8,pppppppp,rnbqkbnr",
		customPieceDict: Map<string, PieceRule> = new Map<string, PieceRule>()
	) {
		// Input string contains board size, state, and piece behavior
		// Currently piece behavior is not processed
		const inputArr = input.split(" ");

		// Set board size
		const rawBoardSizeArr = inputArr[0].split(",");
		this.size = new Vec(
			parseInt(rawBoardSizeArr[0]),
			parseInt(rawBoardSizeArr[1]),
			parseInt(rawBoardSizeArr[2]),
			parseInt(rawBoardSizeArr[3])
		);

		// Initialize layout
		let wInput = inputArr[1] ? inputArr[1].split("|") : [];
		for (let w = 0; this.layout.length < this.size.w; w++) {
			let wLayer = [];
			let zInput = wInput[w] ? wInput[w].split("/") : [];
			for (let z = 0; wLayer.length < this.size.z; z++) {
				let zLayer = [];
				let yInput = zInput[z] ? zInput[z].split(",") : [];
				for (let y = 0; zLayer.length < this.size.y; y++) {
					let yLayer = [];
					let xInput = yInput[y] ? yInput[y].split("") : [];
					for (let x = 0; yLayer.length < this.size.x; x++) {
						if (!xInput[x]) {
							yLayer.push(null);
							continue;
						}
						const pid = xInput[x];
						const skip = parseInt(pid);
						if (skip) {
							for (
								let k = 0;
								k < skip && yLayer.length < this.size.x;
								k++
							) {
								yLayer.push(null);
							}
						} else {
							let piece: Piece = {
								id: pid.toUpperCase(),
								team: pid == pid.toUpperCase() ? 0 : 1,
								flags: []
							};
							switch (pid.toUpperCase()) {
								case "P":
									piece.flags = [0];
									break;
								case "K":
									piece.flags = [1, 2];
									break;
							}
							yLayer.push(piece);
						}
					}
					zLayer.push(yLayer);
				}
				wLayer.push(zLayer);
			}
			this.layout.push(wLayer);
		}

		this.forPiece((loc, piece) => {
			if (piece) {
				this.pois.push({
					piece: piece,
					pos: loc
				});
			}
		});

		this.initPieceDict();

		// Combine custom piece dict with default piece dict
		this.pieceDict = new Map([...this.pieceDict, ...customPieceDict]);
	} // haha love this constructor

	/**
	 * Initializes the movement patterns for each vanilla piece.
	 * The data may be encoded in a different way in the future once I get custom piece data working properly.
	 * @private
	 */
	private initPieceDict() {
		const rook = {
			pathTree: [
				{
					repeat: Infinity,
					attack: 1,
					branches: [
						{direction: new Vec(1)},
						{direction: new Vec(-1)},
						{direction: new Vec(0, 1)},
						{direction: new Vec(0, -1)},
						{direction: new Vec(0, 0, 1)},
						{direction: new Vec(0, 0, -1)},
						{direction: new Vec(0, 0, 0, 1)},
						{direction: new Vec(0, 0, 0, -1)}
					]
				}
			]
		};

		const bishop = {
			pathTree: [
				{
					repeat: Infinity,
					attack: 1,
					branches: [
						{direction: new Vec(1, 1)},
						{direction: new Vec(1, -1)},
						{direction: new Vec(-1, 1)},
						{direction: new Vec(-1, -1)},
						{direction: new Vec(1, 0, 1)},
						{direction: new Vec(1, 0, -1)},
						{direction: new Vec(-1, 0, 1)},
						{direction: new Vec(-1, 0, -1)},
						{direction: new Vec(1, 0, 0, 1)},
						{direction: new Vec(1, 0, 0, -1)},
						{direction: new Vec(-1, 0, 0, 1)},
						{direction: new Vec(-1, 0, 0, -1)},
						{direction: new Vec(0, 1, 1)},
						{direction: new Vec(0, 1, -1)},
						{direction: new Vec(0, -1, 1)},
						{direction: new Vec(0, -1, -1)},
						{direction: new Vec(0, 1, 0, 1)},
						{direction: new Vec(0, 1, 0, -1)},
						{direction: new Vec(0, -1, 0, 1)},
						{direction: new Vec(0, -1, 0, -1)},
						{direction: new Vec(0, 0, 1, 1)},
						{direction: new Vec(0, 0, 1, -1)},
						{direction: new Vec(0, 0, -1, 1)},
						{direction: new Vec(0, 0, -1, -1)}
					]
				}
			]
		};

		const queen = {
			pathTree: [
				{
					branches: ["R", "B"]
				}
			]
		};

		const knight = {
			pathTree: [
				{
					repeat: 1,
					attack: 1,
					branches: [
						{direction: new Vec(2, 1)},
						{direction: new Vec(1, 2)},
						{direction: new Vec(-2, 1)},
						{direction: new Vec(-1, 2)},
						{direction: new Vec(2, -1)},
						{direction: new Vec(1, -2)},
						{direction: new Vec(-2, -1)},
						{direction: new Vec(-1, -2)},
						{direction: new Vec(2, 0, 1)},
						{direction: new Vec(1, 0, 2)},
						{direction: new Vec(-2, 0, 1)},
						{direction: new Vec(-1, 0, 2)},
						{direction: new Vec(2, 0, -1)},
						{direction: new Vec(1, 0, -2)},
						{direction: new Vec(-2, 0, -1)},
						{direction: new Vec(-1, 0, -2)},
						{direction: new Vec(2, 0, 0, 1)},
						{direction: new Vec(1, 0, 0, 2)},
						{direction: new Vec(-2, 0, 0, 1)},
						{direction: new Vec(-1, 0, 0, 2)},
						{direction: new Vec(2, 0, 0, -1)},
						{direction: new Vec(1, 0, 0, -2)},
						{direction: new Vec(-2, 0, 0, -1)},
						{direction: new Vec(-1, 0, 0, -2)},
						{direction: new Vec(0, 2, 1)},
						{direction: new Vec(0, 1, 2)},
						{direction: new Vec(0, -2, 1)},
						{direction: new Vec(0, -1, 2)},
						{direction: new Vec(0, 2, -1)},
						{direction: new Vec(0, 1, -2)},
						{direction: new Vec(0, -2, -1)},
						{direction: new Vec(0, -1, -2)},
						{direction: new Vec(0, 2, 0, 1)},
						{direction: new Vec(0, 1, 0, 2)},
						{direction: new Vec(0, -2, 0, 1)},
						{direction: new Vec(0, -1, 0, 2)},
						{direction: new Vec(0, 2, 0, -1)},
						{direction: new Vec(0, 1, 0, -2)},
						{direction: new Vec(0, -2, 0, -1)},
						{direction: new Vec(0, -1, 0, -2)},
						{direction: new Vec(0, 0, 2, 1)},
						{direction: new Vec(0, 0, 1, 2)},
						{direction: new Vec(0, 0, -2, 1)},
						{direction: new Vec(0, 0, -1, 2)},
						{direction: new Vec(0, 0, 2, -1)},
						{direction: new Vec(0, 0, 1, -2)},
						{direction: new Vec(0, 0, -2, -1)},
						{direction: new Vec(0, 0, -1, -2)}
					]
				}
			]
		};

		const pawn = {
			pathTree: [
				{
					repeat: 1,
					condition: [{team: 0}],
					branches: [
						{direction: new Vec(0, 1), attack: 0},
						{direction: new Vec(0, 0, 0, 1), attack: 0},
						{
							direction: new Vec(1, 1),
							attack: 1,
							condition: [{enemy: new Vec()}]
						},
						{
							direction: new Vec(-1, 1),
							attack: 1,
							condition: [{enemy: new Vec()}]
						},
						{
							direction: new Vec(0, 2),
							attack: 0,
							condition: [
								{flag: 0},
								{inverted: true, piece: new Vec(0, -1)}
							]
						},
						{
							direction: new Vec(1, 1),
							attack: 1,
							condition: [{flag: 1}]
						},
						{
							direction: new Vec(-1, 1),
							attack: 1,
							condition: [{flag: 2}]
						}
					]
				},
				{
					repeat: 1,
					condition: [{team: 1}],
					branches: [
						{direction: new Vec(0, -1), attack: 0},
						{direction: new Vec(0, 0, 0, -1), attack: 0},
						{
							direction: new Vec(1, -1),
							attack: 1,
							condition: [{enemy: new Vec()}]
						},
						{
							direction: new Vec(-1, -1),
							attack: 1,
							condition: [{enemy: new Vec()}]
						},
						{
							direction: new Vec(0, -2),
							attack: 0,
							condition: [
								{flag: 0},
								{inverted: true, piece: new Vec(0, 1)}
							]
						},
						{
							direction: new Vec(1, -1),
							attack: 1,
							condition: [{flag: 1}]
						},
						{
							direction: new Vec(-1, -1),
							attack: 1,
							condition: [{flag: 2}]
						}
					]
				}
			]
		};

		const king = {
			pathTree: [
				{
					repeat: 1,
					attack: 1,
					branches: [
						"Q"
						/*{
							direction: new Vec(2),
							condition: [{ flag: 1 }]
						},
						{
							direction: new Vec(-2),
							condition: [{ flag: 2 }]
						}*/
					]
				}
			]
		};

		this.pieceDict
			.set("R", rook)
			.set("B", bishop)
			.set("Q", queen)
			.set("N", knight)
			.set("P", pawn)
			.set("K", king);
	}

	/**
	 * Get the size of the board.
	 * @returns {Vec}
	 */
	public getSize(): Vec {
		return new Vec(this.size.x, this.size.y, this.size.z, this.size.w);
	}

	/**
	 * Get all of the POIs.
	 * @returns {PieceVec[]}
	 */
	public getPois(): PieceVec[] {
		return this.pois.slice();
	}

	/**
	 * Checks if a vector is within the bounds of the board.
	 * @param {Vec} pos
	 * @returns {boolean}
	 */

	public isInBounds(pos: Vec): boolean {
		return (
			pos.x >= 0 &&
			pos.x < this.size.x &&
			pos.y >= 0 &&
			pos.y < this.size.y &&
			pos.z >= 0 &&
			pos.z < this.size.z &&
			pos.w >= 0 &&
			pos.w < this.size.w
		);
	}

	/**
	 * Get the piece at a position.
	 * @param {Vec} pos
	 * @returns {Piece | null}
	 * @throws {Error} if the position is not on the board.
	 */
	public getPiece(pos: Vec): Piece | null {
		if (this.isInBounds(pos))
			return this.layout[pos.w][pos.z][pos.y][pos.x];
		throw new Error("Cannot access out of bounds position");
	}

	private setPieceLayout(pos: Vec, piece: Piece | null = null): Piece | null {
		let target = this.getPiece(pos);
		this.layout[pos.w][pos.z][pos.y][pos.x] = piece;
		return target;
	}

	private setPiecePoi(pos: Vec, piece: Piece | null = null): Piece | null {
		let target: Piece | null = null;
		for (let i = 0; i < this.pois.length; i++) {
			if (this.pois[i].pos.equals(pos)) {
				target = this.pois[i].piece;
				this.pois.splice(i, 1);
			}
		}
		if (piece !== null) this.pois.push({pos: pos, piece: piece});
		return target;
	}

	/**
	 * Set a piece at a position.
	 * @param {Vec} pos
	 * @param {Piece | null} piece
	 * @returns {Piece | null} the piece that was replaced.
	 * @throws {Error} if the position is not on the board.
	 */
	public setPiece(pos: Vec, piece: Piece | null = null): Piece | null {
		this.clearCache();
		let target = this.setPieceLayout(pos, piece);
		if (piece !== null) this.removePoi(pos);
		else this.setPiecePoi(pos, piece);
		return target;
	}

	private removePoi(pos: Vec): Piece | null {
		let target: Piece | null = null;
		for (let i = 0; i < this.pois.length; i++) {
			if (this.pois[i].pos.equals(pos)) {
				target = this.pois[i].piece;
				this.pois.splice(i, 1);
			}
		}
		return target;
	}

	/**
	 * Move a piece from one position to another.
	 * @param {Move} mov
	 * @returns {Piece | null} the piece that was replaced at the target position.
	 * @throws {Error} if the source position is not on the board.
	 * @throws {Error} if the target position is not on the board.
	 */
	public move(mov: Move, clearCache: boolean = true): Piece | null {
		if (clearCache) this.clearCache();
		let piece = this.setPieceLayout(mov.src, null);
		let target = this.setPieceLayout(mov.dst, piece);
		// hacky workaround
		if (piece && piece.flags.includes(0)) piece.flags = [];
		this.setPiecePoi(mov.dst, piece);
		this.removePoi(mov.src);
		return target;
	}

	/**
	 * Get all possible moves for a piece.
	 * @param {Vec} pos
	 * @param {boolean} [kingCheck=true]
	 * @returns {Move[]}
	 */
	public getMoves(pos: Vec, kingCheck: boolean = true): Move[] {
		let moves: Move[] = [];
		let piece = this.getPiece(pos);
		if (piece === null) return [];
		if (!this.pieceDict.has(piece.id))
			throw new Error(
				`Piece dictionary does not contain piece type ${piece.id}`
			);
		let data = this.pieceDict.get(piece.id)!;

		if (kingCheck && this.cache.has(Vec.serialize(pos))) {
			return this.cache.get(Vec.serialize(pos)) as Move[];
		}

		for (let path of data.pathTree) {
			let stats = {
				repeat: null,
				attack: null
			};
			moves = moves.concat(this.evaluatePath(piece, pos, path, stats));
		}

		if (kingCheck) {
			let checkedMoves = [];
			for (let i = 0; i < moves.length; i++) {
				if (!this.putsKingInCheck(moves[i], piece.team)) {
					checkedMoves.push(moves[i]);
				}
			}
			this.cache.set(Vec.serialize(pos), checkedMoves);
			return checkedMoves;
		}

		return moves;
	}

	private evaluatePath(
		piece: Piece,
		pos: Vec,
		path: Path,
		stats: {repeat: number | null; attack: number | null}
	): Move[] {
		let moves: Move[] = [];
		if (path.condition) {
			for (let con of path.condition) {
				let result = true;
				if (result && con.team != null && piece.team != con.team) {
					result = false;
				}
				if (
					result &&
					con.flag != null &&
					!piece.flags?.includes(con.flag)
				) {
					result = false;
				}
				if (result && con.piece != null) {
					let loc = new Vec(
						pos.x + con.piece.x + (path.direction?.x || 0),
						pos.y + con.piece.y + (path.direction?.y || 0),
						pos.z + con.piece.z + (path.direction?.z || 0),
						pos.w + con.piece.w + (path.direction?.w || 0)
					);
					if (!this.isInBounds(loc) || !this.getPiece(loc))
						result = false;
				}
				if (result && con.enemy != null) {
					let loc = new Vec(
						pos.x + con.enemy.x + (path.direction?.x || 0),
						pos.y + con.enemy.y + (path.direction?.y || 0),
						pos.z + con.enemy.z + (path.direction?.z || 0),
						pos.w + con.enemy.w + (path.direction?.w || 0)
					);
					if (this.isInBounds(loc)) {
						let view = this.getPiece(loc);
						if (!view || view.team == piece.team) {
							result = false;
						}
					} else {
						result = false;
					}
				}
				if (con.inverted) {
					result = !result;
				}
				if (!result) {
					return [];
				}
			}
		}

		if (stats.repeat == null && path.repeat != null && path.repeat >= 1)
			stats.repeat = path.repeat;
		if (stats.attack == null && path.attack != null && path.attack >= 0)
			stats.attack = path.attack;

		if (path.direction) {
			let loc = pos.clone();
			let atkCount = 0;
			if (stats.repeat == null || stats.attack == null) return [];
			for (let count = 0; count < stats.repeat; count++) {
				loc = loc.add(path.direction);
				if (!this.isInBounds(loc)) break;
				let view = this.getPiece(loc);
				if (view === null) {
					moves.push(new Move(pos, loc));
					continue;
				}
				if (view.team == piece.team) break;
				atkCount++;
				moves.push(new Move(pos, loc));
				if (atkCount == stats.attack) break;
			}
		} else if (path.branches) {
			for (let branch of path.branches) {
				let statsCopy = {
					repeat: stats.repeat,
					attack: stats.attack
				};
				if (typeof branch == "string") {
					if (branch == piece.id) return [];
					let tree = this.pieceDict.get(branch)!.pathTree;
					for (let branch2 of tree) {
						moves = moves.concat(
							this.evaluatePath(piece, pos, branch2, statsCopy)
						);
					}
				} else {
					moves = moves.concat(
						this.evaluatePath(piece, pos, branch, statsCopy)
					);
				}
			}
		}

		return moves;
	}

	/**
	 * Clears the caches of possible moves.
	 * @private
	 */
	private clearCache() {
		this.cache.clear();
	}

	/**
	 * Runs a function on every piece in the board.
	 * @param {(loc: Vec, piece: Piece | null) => void} fn The function to run.
	 */
	public forPiece(fn: (loc: Vec, piece: Piece | null) => void): void {
		for (let w = 0; w < this.size.w && w < this.layout.length; w++) {
			for (let z = 0; z < this.size.z && this.layout[w].length; z++) {
				for (
					let y = 0;
					y < this.size.y && this.layout[w][z].length;
					y++
				) {
					for (
						let x = 0;
						x < this.size.x && this.layout[w][z][y].length;
						x++
					) {
						let loc = new Vec(x, y, z, w);
						fn(loc, this.getPiece(loc));
					}
				}
			}
		}
	}

	/**
	 * Checks if a move puts the king in check.
	 * @param {Move} mov The move to check.
	 * @param {Team} team The team of the king to check.
	 * @returns {boolean} Whether or not the king is in check.
	 */
	public putsKingInCheck(mov: Move, team: number): boolean {
		let piece: Piece | null = this.getPiece(mov.src);
		if (piece === null) return false;
		let layoutClone = JSON.parse(JSON.stringify(this.layout));
		let poisClone = this.getPois().slice(0);
		this.move(mov, false);
		let kings: Vec[] = [];
		for (let poi of this.getPois()) {
			if (poi.piece.id === "K" && poi.piece.team === team)
				kings.push(poi.pos);
		}
		let moves = this.getMovesForTeam(team ? 0 : 1, false);
		this.layout = layoutClone;
		this.pois = poisClone;
		for (let m of moves) {
			for (let k of kings) {
				if (k.equals(m.dst)) return true;
			}
		}
		return false;
	}

	/**
	 * Does the specified move if it is valid.
	 * @param {Move} mov The move to do.
	 * @returns {Piece | null | boolean} The piece that was taken, or false if the move was invalid.
	 */
	public moveIfValid(mov: Move): Piece | null | boolean {
		if (this.isValidMove(mov)) {
			return this.move(mov);
		} else return false;
	}

	/**
	 * Checks if a move is valid.
	 * @param {Move} mov The move to check.
	 * @param {boolean} [kingCheck=true] Whether or not to check if the king is in check.
	 * @returns {boolean} Whether or not the move is valid.
	 */
	public isValidMove(mov: Move, kingCheck: boolean = true): boolean {
		let moves = this.getMoves(mov.src, kingCheck);
		return moves.some(a => a.src.equals(mov.src) && a.dst.equals(mov.dst));
	}

	/**
	 * Get all valid moves for a specified team.
	 * @param {number} team The team to get moves for.
	 * @param {boolean} [kingCheck=true] Whether or not to check if the king is in check.
	 * @returns {Move[]} The valid moves for the specified team.
	 * @see getMoves
	 */
	public getMovesForTeam(team: number, kingCheck: boolean = true): Move[] {
		let moves: Move[] = [];
		for (let poi of this.getPois()) {
			if (poi.piece.team === team) {
				moves = moves.concat(this.getMoves(poi.pos, kingCheck));
			}
		}
		return moves;
	}
}
