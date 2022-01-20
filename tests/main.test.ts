import { expect } from 'chai'
import { randomString } from '@stablelib/random'
import { CeramicSDK } from '../main'

import { getPublic } from '@toruslabs/eccrypto'

const pauseSeconds = (sec: number) => new Promise(res => setTimeout(res, sec * 1000))

const NODE_URL_3BOXLABS = 'https://ceramic-clay.3boxlabs.com'
const NODE_URL_TESTNET = 'https://gateway-clay.ceramic.network'
const NODE_URL_MAINNET = 'https://gateway.ceramic.network'
const randPrivateKey = () => randomString(64, '0123456789abcdef')

describe('Initialize a new Decentralized Identifier.', () => {
  it('Should initialize a DID based on privatekey', async () => {
    const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS)
    const myPrvkey = randPrivateKey() // Length need to be 32
    const res = await sdkClient.initialize(myPrvkey, 'pubkeyToUseAsAuthId', 'provider')
    expect(res).to.match(/did:3:.*/)
    const meta = (await sdkClient.getMeta()) as any
    expect(meta.content.masterSeed).to.not.empty
    expect(Object.keys(meta.content.authenticators).length).to.equal(1)
    expect(meta.content.authenticators['pubkeyToUseAsAuthId']).to.equal('provider')
    // expect(res).to.equal('did:3:kjzl6cwe1jw1494fmr39v7jqm87qkukqt38cf6fvtk091qcl795u1n4okkj5b7w')
  }).timeout(30000)
})

describe('Add a new private key as authSecret', () => {
  const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS)
  const myPrvkey = randPrivateKey() // Length need to be 32
  const derivedPubkey2 = randomString(20)
  const myNewPrvkey = randPrivateKey() //  Length need to be 32

  it('Should retrieve the same DID for two different authSecrets', async () => {

    const res = await sdkClient.initialize(myPrvkey, 'pubkeyToUseAsAuthId', 'provider')

    await sdkClient.addAuthenticator(myNewPrvkey, derivedPubkey2, 'provider2')

    const resNewPrvKey = await sdkClient.initialize(myNewPrvkey, derivedPubkey2, 'provider2')
    expect(resNewPrvKey).to.equal(res)

    const meta = (await sdkClient.getMeta()) as any
    expect(meta.content.authenticators[derivedPubkey2]).to.eq('provider2')
    expect(meta.content.authenticators['pubkeyToUseAsAuthId']).to.eq('provider')    
  }).timeout(80000)

  it("should get provider key pair", async () => {
    const main = await sdkClient.getProviderKeyPair('provider')
    const second = await sdkClient.getProviderKeyPair('provider2')
    expect(main).to.eql({publicKey: 'pubkeyToUseAsAuthId', privateKey: myPrvkey})
    expect(second).to.eql({publicKey: derivedPubkey2, privateKey: myNewPrvkey})
  })
  it('Should fail since the key was not added as authSecret', async () => {
    const myPrvkey = randPrivateKey() // Length need to be 32
    const myNewPrvkey = randPrivateKey() //  Length need to be 32
    const res = await sdkClient.initialize(myPrvkey, randomString(32), 'provider')

    // myNewPrvkey was not added inside the list of authenticator so this will fail
    const resNewPrvKey = await sdkClient.initialize(myNewPrvkey, randomString(32), 'provider')
    expect(resNewPrvKey).not.to.equal(res)
  }).timeout(90000)
})

describe('Remove an authenticator from the the authenticator set', () => {
  const pubkey1 = 'pubkeyToUseAsAuthId'
  const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS)

  it('Should remove from the authenticator list', async () => {
    const prvkey = randPrivateKey()
    const idw1 = await sdkClient.initialize(prvkey, pubkey1, 'provider')
    const chainList = await sdkClient.threeIdProvider.keychain.list()

    expect(chainList[0]).to.equal(pubkey1)

    const prvkey2 = randPrivateKey()
    const pubkey2 = randomString(32)
    const authSecret = Buffer.from(prvkey2, "hex")
    await sdkClient.threeIdProvider.keychain.add(pubkey2, authSecret)
    await pauseSeconds(2)
    await sdkClient.threeIdProvider.keychain.commit()

    const newChainList = await sdkClient.threeIdProvider.keychain.list()

    expect(newChainList[0]).to.equal(pubkey1)
    expect(newChainList[1]).to.equal(pubkey2)

    await sdkClient.removeAuthenticator(pubkey2)
    const listAfterRemoval = await sdkClient.threeIdProvider.keychain.list()

    expect(listAfterRemoval.length).to.equal(1)
    expect(listAfterRemoval[0]).to.equal(pubkey1)

    const meta = (await sdkClient.getMeta()) as any
    expect(meta.content.authenticators[pubkey2]).to.undefined
  }).timeout(90000)
})

describe('Create a new tiled document', () => {
  it('Store the encrypted seed inside masterSeed field', async () => {
    const pubkey = 'pubkeyToUseAsAuthId'
    const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS)
    const myPrvkey = randPrivateKey() // Length need to be 32
    await sdkClient.initialize(myPrvkey, pubkey, 'provider')

    // Retreive the encrypted and stored private key and compare it with myprvkey

    const retrievedMasterSeed = await sdkClient.getMasterSeed()
    expect(retrievedMasterSeed).to.equal(myPrvkey)
  }).timeout(80000)
})

describe('Encrypt/decrypt', () => {  

  it('reduce/restore keys', async () => {
    const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS)
    const myPrvkey = randPrivateKey() // Length need to be 32
    const seed = randPrivateKey()
   
    const encrypted = sdkClient.reduceKey(myPrvkey, seed)

    const decrypt = sdkClient.restoreKey(encrypted, seed)
    expect(myPrvkey).equal(decrypt)    
  }).timeout(80000)

})

describe('Check masterSeed field not updated', () => {
  const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS)

  it('Should not update the masterSeed field with different authID', async () => {
    const myPrvkey = randPrivateKey()
    const res = await sdkClient.initialize(myPrvkey, 'pubkeyToUseAsAuthId1', 'provider')
    const docBefore = await sdkClient.initializeMasterSeed(myPrvkey, 'pubkey', 'provider')

    const res2 = await sdkClient.initialize(myPrvkey, 'pubkeyToUseAsAuthId2', 'provider')
    const docAfter = await sdkClient.initializeMasterSeed(myPrvkey, 'pubkey', 'provider')

    expect(res).eq(res2)
    expect(docAfter.controllers[0]).to.equal(docBefore.controllers[0])
    expect((<Record<string, any>>docAfter.content).masterSeed.iv).deep.equal(
      (<Record<string, any>>docAfter.content).masterSeed.iv
    )
    expect((<Record<string, any>>docAfter.content).masterSeed.ciphertext).deep.equal(
      (<Record<string, any>>docAfter.content).masterSeed.ciphertext
    )
  }).timeout(90000)
})
