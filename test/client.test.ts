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
    sasat.disconnect();
  });
});
