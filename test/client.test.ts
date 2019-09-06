import { SassatClient } from "../src/sasat/client";

const sassat = new SassatClient();

it("client", () => {
  return sassat.init().then(async () => {
    expect(await sassat.getString("name1", "2")).toBe("sqwf");
    await sassat.updateString("name1", 2, "changed2");
    expect(await sassat.getString("name1", "2")).toBe("changed2");
    expect(await sassat.getString("name2", "222")).toBe('{"id":222,"c1":"2d ","c2":"fwq"}');

    expect(await sassat.getJSONString("name2", "222")).toEqual({ id: 222, c1: "2d ", c2: "fwq" });
    await sassat.updateJSONString("name2", "222", { id: 222, c1: "cvv", c2: "ssswwwvvv22" });
    expect(await sassat.getJSONString("name2", "222")).toEqual({ id: 222, c1: "cvv", c2: "ssswwwvvv22" });

    expect(await sassat.getHash("name3", "222", "c1")).toBe("2d ");
    expect(await sassat.getHashAll("name3", "222")).toEqual({ id: "222", c1: "2d ", c2: "fwq" });
    await sassat.updateHash("name3", "222", { id: 222, c1: "33", c2: "vvvvv" });
    expect(await sassat.getHash("name3", "222", "c1")).toBe("33");
    expect(await sassat.getHashAll("name3", "222")).toEqual({ id: "222", c1: "33", c2: "vvvvv" });
    sassat.disconnect();
  });
});
