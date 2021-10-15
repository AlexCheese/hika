const { Game, Move, Vec } = require("../dist/hika");

let game1 = new Game("8,8,1,1 5rk1,1N3ppp,8,2q5,1B6,4RP2,4Q1PP,5RK1");

test("game1: number of white moves is 31", () => {
	expect(game1.getMovesForTeam(0).length).toBe(31);
})

test("game1: number of black moves is 28", () => {
	expect(game1.getMovesForTeam(1).length).toBe(28);
})

test("game1: pois and layout are synchronized", () => {
	let a = 0;
	game1.forPiece((_, piece) => {
		if (piece) a++;
	})
	expect(game1.getPois().length).toBe(a);
})

test("game1: pois and layout are synchronized after move", () => {
	game1.move(new Move(new Vec(6, 0), new Vec(7, 0)));
	let a = 0;
	game1.forPiece((_, piece) => {
		if (piece) a++;
	})
	expect(game1.getPois().length).toBe(a);
})

let game2 = new Game();

test("game2: number of white moves is 20", () => {
	expect(game2.getMovesForTeam(0).length).toBe(20);
})

test("game2: number of white moves is 19 after moves", () => {
	game2.moveIfValid(new Move(new Vec(0, 1), new Vec(0, 2)));
	expect(game2.getMovesForTeam(0).length).toBe(19);
})

test("game2: number of white moves is still 19", () => {
	expect(game2.getMovesForTeam(0).length).toBe(19);
})

test("game2: knight is a poi", () => {
	let result = false;
	for (let poi of game2.getPois()) {
		if (poi.pos.equals(new Vec(1))) {
			result = true;
		}
	}
	expect(result).toBe(true);
})

test("game2: number of pois is 32", () => {
	expect(game2.getPois().length).toBe(32);
})

test("game2: knight has 1 possible move", () => {
	let moves = game2.getMoves(new Vec(1));
	expect(moves.length).toBe(1);
})

test("game2: pois and layout are synchronized", () => {
	let a = 0;
	game2.forPiece((_, piece) => {
		if (piece) a++;
	})
	expect(game2.getPois().length).toBe(a);
})

test("game2: knight can move to c3", () => {
	expect(game2.isValidMove(new Move(new Vec(1, 0), new Vec(2, 2)))).toBe(true);
	expect(Move.serialize(game2.getMoves(new Vec(1))[0]))
		.toBe("1,0,0,0/2,2,0,0");
})
