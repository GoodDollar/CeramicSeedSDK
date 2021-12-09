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
        var myPrvkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // Length need to be 32
        var res = await initialize(myPrvkey);
        expect(res).to.equal("did:3:kjzl6cwe1jw1494fmr39v7jqm87qkukqt38cf6fvtk091qcl795u1n4okkj5b7w");
    }).timeout(50000);
});
