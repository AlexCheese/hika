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
	console.log(game2.moveIfValid(new Move(new Vec(0, 1), new Vec(0, 2))));
	expect(game2.getMovesForTeam(0).length).toBe(19);
})