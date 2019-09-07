import { SasatClient } from "../src/sasat/client";

const sasat = new SasatClient();

it("client", () => {
  return sasat.init().then(async () => {
    expect(await sasat.getString("name1", "2")).toBe("sqwf");
    await sasat.updateString("name1", 2, "changed2");
    expect(await sasat.getString("name1", "2")).toBe("changed2");
    expect(await sasat.getString("name2", "222")).toBe('{"id":222,"c1":"2d ","c2":"fwq"}');

    expect(await sasat.getJSONString("name2", "222")).toEqual({ id: 222, c1: "2d ", c2: "fwq" });
    await sasat.updateJSONString("name2", "222", { id: 222, c1: "cvv", c2: "ssswwwvvv22" });
    expect(await sasat.getJSONString("name2", "222")).toEqual({ id: 222, c1: "cvv", c2: "ssswwwvvv22" });

    expect(await sasat.getHash("name3", "222", "c1")).toBe("2d ");
    expect(await sasat.getHashAll("name3", "222")).toEqual({ id: "222", c1: "2d ", c2: "fwq" });
    await sasat.updateHash("name3", "222", { id: 222, c1: "33", c2: "vvvvv" });
    expect(await sasat.getHash("name3", "222", "c1")).toBe("33");
    expect(await sasat.getHashAll("name3", "222")).toEqual({ id: "222", c1: "33", c2: "vvvvv" });

    await sasat.insertHashWithDb("name3", { c1: "c111", c2: "c2222" });
    expect((await sasat.db.rawQuery("select * from test where id = 25256"))[0]).toEqual({
      c1: "c111",
      c2: "c2222",
      id: 25256,
    });
    expect(await sasat.redis.hget("2__25256", "id")).toBe("25256");

    await sasat.insertJSONStringWithDb("name2", { c1: "vvvc111", c2: "vvvc2222" });
    expect((await sasat.db.rawQuery("select * from test where id = 25257"))[0]).toEqual({
      c1: "vvvc111",
      c2: "vvvc2222",
      id: 25257,
    });
    // @ts-ignore
    expect(JSON.parse(await sasat.redis.get("1__25257")).id).toBe(25257);
    sasat.disconnect();
  });
});
