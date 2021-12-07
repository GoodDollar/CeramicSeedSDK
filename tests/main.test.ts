import { expect } from 'chai';
import { initialize } from '../main';

describe("Hello", () => {
    describe("World", () => {
        it("Should return the string Hello World", () => {
            
            var result = "Hello World";

            expect(result).to.equal("Hello World");
        });
    })
});


describe("Initialize a new Decentralized Identifier.", () => {
    it("Should initialize a DID based on privatekey", async (done) => {
        var myPrvkey = "thisismyprivakey";
        var res = await initialize(myPrvkey);

        expect(res).to.equal("did:3:kjzl6cwe1jw149e9y4s2t4qxj0h83nmom3cjyot6t6e04ao6wbh543f66l25c64");
    });
});
