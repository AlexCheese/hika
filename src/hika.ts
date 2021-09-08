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
	add(v: Vec): Vec {
		return new Vec(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
	}
	clone(): Vec {
		return new Vec(this.x, this.y, this.z, this.w);
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

export type Move = {
	src: Vec;
	dst: Vec;
	int?: Vec[];
}

export class Game {
	private readonly size: Vec;
	private layout: (Piece | null)[][][][] = [];
	private pieceDict: { [id: string]: PieceRule } = {};

	constructor(input: string = "8,8,1,1 RNBQKBNR,PPPPPPPP,8,8,8,8,pppppppp,rnbqkbnr") {
		// Input string contains board size, state, and piece behavior
		// Currently piece behavior is not processed
		const inputArr = input.split(" ");

		// Set board size
		const rawBoardSizeArr = inputArr[0].split(",");
		this.size = new Vec(parseInt(rawBoardSizeArr[0]), parseInt(rawBoardSizeArr[1]), parseInt(rawBoardSizeArr[2]), parseInt(rawBoardSizeArr[3]));

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
							for (let k = 0; k < skip && yLayer.length < this.size.x; k++) {
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

		this.initPieceDict();
	} // haha love this constructor

	private initPieceDict() {
		// Construct piece dictionary
		// The following standard data may be encoded
		// in the future, when I get custom piece data
		// working properly
		const rook = {
			pathTree: [
				{
					repeat: Infinity,
					attack: 1,
					branches: [
						{ direction: new Vec(1) },
						{ direction: new Vec(-1) },
						{ direction: new Vec(0, 1) },
						{ direction: new Vec(0, -1) }
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
						{ direction: new Vec(1, 1) },
						{ direction: new Vec(1, -1) },
						{ direction: new Vec(-1, 1) },
						{ direction: new Vec(-1, -1) }
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
						{ direction: new Vec(2, 1) },
						{ direction: new Vec(1, 2) },
						{ direction: new Vec(-2, 1) },
						{ direction: new Vec(-1, 2) },
						{ direction: new Vec(2, -1) },
						{ direction: new Vec(1, -2) },
						{ direction: new Vec(-2, -1) },
						{ direction: new Vec(-1, -2) }
					]
				}
			]
		};

		const pawn = {
			pathTree: [
				{
					repeat: 1,
					condition: [{ team: 0 }],
					branches: [
						{ direction: new Vec(0, 1), attack: 0 },
						{ direction: new Vec(1, 1), attack: 1, condition: [{ enemy: new Vec() }] },
						{ direction: new Vec(-1, 1), attack: 1, condition: [{ enemy: new Vec() }] },
						{ direction: new Vec(0, 2), attack: 0, condition: [{ flag: 0 }, { inverted: true, piece: new Vec(0, -1) }] },
						{ direction: new Vec(1, 1), attack: 1, condition: [{ flag: 1 }] },
						{ direction: new Vec(-1, 1), attack: 1, condition: [{ flag: 2 }] }
					]
				},
				{
					repeat: 1,
					condition: [{ team: 1 }],
					branches: [
						{ direction: new Vec(0, -1), attack: 0 },
						{ direction: new Vec(1, -1), attack: 1, condition: [{ enemy: new Vec() }] },
						{ direction: new Vec(-1, -1), attack: 1, condition: [{ enemy: new Vec() }] },
						{ direction: new Vec(0, -2), attack: 0, condition: [{ flag: 0 }, { inverted: true, piece: new Vec(0, 1) }] },
						{ direction: new Vec(1, -1), attack: 1, condition: [{ flag: 1 }] },
						{ direction: new Vec(-1, -1), attack: 1, condition: [{ flag: 2 }] }
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
						"Q",
						{
							direction: new Vec(2),
							condition: [{ flag: 1 }]
						},
						{
							direction: new Vec(-2),
							condition: [{ flag: 2 }]
						}
					]
				}
			]
		};

		this.pieceDict = {
			R: rook,
			B: bishop,
			Q: queen,
			N: knight,
			P: pawn,
			K: king
		};
	}

	public getSize(): Vec {
		return new Vec(this.size.x, this.size.y, this.size.z, this.size.w);
	}

	public isInBounds(pos: Vec): Boolean {
		if (pos.x >= 0 && pos.x < this.size.x
			&& pos.y >= 0 && pos.y < this.size.y
			&& pos.z >= 0 && pos.z < this.size.z
			&& pos.w >= 0 && pos.w < this.size.w)
			return true;
		else return false;
	}

	public getPiece(pos: Vec): Piece | null {
		try {
			let piece = this.layout[pos.w][pos.z][pos.y][pos.x];
			if (piece === undefined) throw new Error("Cannot access out of bounds position");
			return piece;
		} catch(e) {
			throw new Error("Cannot access out of bounds position");
		}
	}

	public setPiece(pos: Vec, piece: Piece | null = null): Piece | null {
		let target = this.getPiece(pos);
		this.layout[pos.w][pos.z][pos.y][pos.x] = piece;
		return target;
	}

	public move(mov: Move): Piece | null {
		let piece = this.setPiece(mov.src, null);
		let target = this.setPiece(mov.dst, piece);
		return target;
	}

	public getMoves(pos: Vec, kingCheck: Boolean = true): Move[] {
		let moves: Move[] = [];
		let piece = this.getPiece(pos);
		if (piece === null) return [];
		let data = this.pieceDict[piece.id];

		for (let path of data.pathTree) {
			let stats = {
				repeat: null,
				attack: null
			};
			moves = moves.concat(this.evaluatePath(piece, pos, path, stats));
		}

		if (kingCheck) {
			for (let [ind, mov] of moves.entries()) {
				if (this.putsKingInCheck(mov)) {
					moves.splice(ind, 1);
				}
			}
		}

		return moves;
	}

	private evaluatePath(piece: Piece, pos: Vec, path: Path, stats: { repeat: number | null; attack: number | null }): Move[] {
		let moves: Move[] = [];
		if (path.condition) {
			for (let con of path.condition) {
				let result = true;
				if (con.team != null && piece.team != con.team) {
					result = false;
				}
				if (con.flag != null && !piece.flags?.includes(con.flag)) {
					result = false;
				}
				if (con.piece != null) {
					let loc = new Vec(
						pos.x + con.piece.x + (path.direction?.x || 0),
						pos.y + con.piece.y + (path.direction?.y || 0),
						pos.z + con.piece.z + (path.direction?.z || 0),
						pos.w + con.piece.w + (path.direction?.w || 0)
					);
					try {
						if (!this.getPiece(loc)) {
							result = false;
						}
					} catch {
						result = false;
					}
				}
				if (con.enemy != null) {
					let loc = new Vec(
						pos.x + con.enemy.x + (path.direction?.x || 0),
						pos.y + con.enemy.y + (path.direction?.y || 0),
						pos.z + con.enemy.z + (path.direction?.z || 0),
						pos.w + con.enemy.w + (path.direction?.w || 0)
					);
					try {
						let view = this.getPiece(loc);
						if (!view || view.team == piece.team) {
							result = false;
						}
					} catch {
						result = false;
					}
				}
				if (con.inverted) {
					result = result ? false : true;
				}
				if (!result) {
					return [];
				}
			}
		}

		if (stats.repeat == null && path.repeat != null && path.repeat >= 1) stats.repeat = path.repeat;
		if (stats.attack == null && path.attack != null && path.attack >= 0) stats.attack = path.attack;

		if (path.direction) {
			let loc = pos.clone();
			let atkCount = 0;
			if (stats.repeat == null || stats.attack == null) return [];
			for (let count = 0; count < stats.repeat; count++) {
				loc = loc.add(path.direction);
				let view;
				try {
					view = this.getPiece(loc);
				} catch {
					break;
				}
				if (view === null) {
					moves.push({ src: pos, dst: loc });
					continue;
				}
				if (view.team == piece.team) break;
				if (atkCount == stats.attack) break;
				atkCount++;
				moves.push({ src: pos, dst: loc });
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
					let tree = this.pieceDict[branch].pathTree;
					for (let branch2 of tree) {
						moves = moves.concat(this.evaluatePath(piece, pos, branch2, statsCopy));
					}
				} else {
					moves = moves.concat(this.evaluatePath(piece, pos, branch, statsCopy));
				}
			}
		}

		return moves;
	}

	public forPiece(fn: Function) {
		for (let w = 0; w < this.size.w && w < this.layout.length; w++) {
			for (let z = 0; z < this.size.z && this.layout[w].length; z++) {
				for (let y = 0; y < this.size.y && this.layout[w][z].length; y++) {
					for (let x = 0; x < this.size.x && this.layout[w][z][y].length; x++) {
						let loc = new Vec(x, y, z, w);
						fn(loc, this.getPiece(loc));
					}
				}
			}
		}
	}

	public putsKingInCheck(mov: Move): Boolean {
		let piece: Piece | null = this.getPiece(mov.src);
		if (piece == null) return false;
		let layoutClone = JSON.parse(JSON.stringify(this.layout));
		let taken = this.move(mov);
		let kings: Vec[] = [];
		this.forPiece((loc: Vec, target: Piece | null) => {
			if (target && piece && target.id === 'K' && target.team !== piece.team)
				kings.push(loc);
		});
		let moves = this.getMovesForTeam(piece.team ? 0 : 1, false);
		this.layout = layoutClone;
		for (let m of moves) {
			if (kings.includes(m.dst)) return true;
		}
		return false;
	}

	public moveIfValid(mov: Move): Piece | null | Boolean {
		if (this.isValidMove(mov)) {
			return this.move(mov);
		} else return false;
	}

	public isValidMove(mov: Move, kingCheck: Boolean = true): Boolean {
		let moves = this.getMoves(mov.src);
		return moves.includes(mov);
	}

	public getMovesForTeam(team: number, kingCheck: Boolean = true): Move[] {
		let moves: Move[] = [];
		this.forPiece((loc: Vec, piece: Piece | null) => {
			if (piece && piece.team === team)
				moves = moves.concat(this.getMoves(loc, kingCheck));
		});
		return moves;
	}
}