import { expect } from 'chai';
import { addAuthenticator, initialize } from '../main';

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

describe.only("Add a new private key as authSecret", () => {
    it("Should retrieve the same DID for two different authSecrents", async (done) => {
        var myPrvkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // Length need to be 32
        var myNewPrvkey = "1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1"; // Length need to be 32
        var res = await initialize(myPrvkey);
        expect(res).to.equal("did:3:kjzl6cwe1jw1494fmr39v7jqm87qkukqt38cf6fvtk091qcl795u1n4okkj5b7w");
        await addAuthenticator(myPrvkey, myNewPrvkey);

        var resNewPrvKey = await initialize(myNewPrvkey);
        expect(resNewPrvKey).to.equal(res);

    }).timeout(50000);
});
