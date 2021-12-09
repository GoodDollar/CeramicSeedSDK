import { expect } from 'chai';
import { randomString } from '@stablelib/random'
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
        const myPrvkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // Length need to be 32
        const res = await initialize(myPrvkey);
        expect(res.did).to.equal("did:3:kjzl6cwe1jw1494fmr39v7jqm87qkukqt38cf6fvtk091qcl795u1n4okkj5b7w");
    }).timeout(50000);
});

describe.only("Add a new private key as authSecret", () => {
    it("Should retrieve the same DID for two different authSecrents", async (done) => {
        const myPrvkey = "7yaAGVXHhcLFGXL3uQV0Ne85CDFlZjJa"; // Length need to be 32
        const myNewPrvkey = "RIqUaX127GgnirqYVfMKospZRS3wBhgJ"; //  Length need to be 32
        
        const res = await initialize(myPrvkey);
        await addAuthenticator(res.authId, myPrvkey, myNewPrvkey);

        const resNewPrvKey = await initialize(myNewPrvkey);
        expect(resNewPrvKey.did).to.equal(res.did); // gd-3id-ceramic-oWaCf and gd-3id-ceramic-LuAYd
    }).timeout(80000);

    it.only("Should fail since the key was not added as authSecret", async() => {
        const myPrvkey = "7yaAGVXHhcLFGXL3uQV0Ne85CDFlZjJa"; // Length need to be 32
        const myNewPrvkey = "PIqUaX127GgnirqYVfMKospZRS3wBhgJ"; //  Length need to be 32
        const res = await initialize(myPrvkey);

        // myNewPrvkey was not added inside the list of authenticator so this will fail
        const resNewPrvKey = await initialize(myNewPrvkey);
        expect(resNewPrvKey.did).not.to.equal(res.did);
    }).timeout(90000);

});
