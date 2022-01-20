import { CeramicClient } from '@ceramicnetwork/http-client'
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import KeyDidResolver from 'key-did-resolver'
import ThreeIdProvider from '3id-did-provider'
import { DID } from 'dids'
import BN from 'bn.js'

export class CeramicSDK {
  threeIdProvider!: ThreeIdProvider
  ceramic: CeramicClient
  authId!: string

  constructor(networkUrl: string) {
    this.ceramic = new CeramicClient(networkUrl)
  }

  async getPermission(request: any) {
    return request.payload.paths
  }

  async getMeta() {
    const doc = await TileDocument.deterministic(this.ceramic, {
      family: 'masterSeed',
      tags: ['v3'],
      controllers: [this.ceramic.did?.id as string]
    })

    return doc
  }
  /**
   * Creates or retrieves a TileDocument containing the master seed field
   *
   * @param publickey
   * @param prvkey the data to store inside masterSeed field
   * @param did a DID that will control the stream
   */
  async initializeMasterSeed(prvkey: string, publicKey: string, label: string) {
    const doc = await this.getMeta()

    const docType = doc.content as Record<string, any>

    if (docType.masterSeed) {
      return doc
    }


    const encryptedData = await this.encrypt({prvkey})
    await doc.update({ masterSeed: encryptedData, authenticators: { [publicKey]: label }, keys: { [publicKey] : encryptedData } })
    return doc
  }

  reduceKey(key: string, seed: string): string {
    const a = new BN(key,16)
    const b = new BN(seed,16)
    return a.sub(b).toString("hex")
  }

  restoreKey(reduced: string, seed: string) {
    const a = new BN(reduced,16)
    const b = new BN(seed,16)
    return a.add(b).toString("hex")
  }

  async encrypt(dataToEncrypt: any): Promise<any> {
    const encrypted = await this.ceramic.did?.createDagJWE(dataToEncrypt,[this.ceramic.did?.id])

    return encrypted
  }

  async decrypt(encryptedData: any): Promise<any> {
    const decrypted = await this.ceramic.did?.decryptDagJWE(encryptedData)
    return decrypted
  }

  /**
   * Initialize a DID based on private key and create a new one if none exists
   * Will also encrypt the private key and store it inside masterSeed field
   * @param prvKey the private key to use to create a new DID
   * @param pubKey the public key derived from prvkey that will be used as authId
   * @returns string
   */
  async initialize(prvKey: string, pubKey: string, label: string): Promise<any> {
    const authSecret = Buffer.from(prvKey,"hex")
    this.authId = pubKey
    const config = {
      getPermission: this.getPermission,
      ceramic: this.ceramic,
      authId: this.authId,
      authSecret
    }
    this.threeIdProvider = await ThreeIdProvider.create(config)
    const provider = this.threeIdProvider.getDidProvider()
    const resolver = {
      ...KeyDidResolver.getResolver(),
      ...ThreeIdResolver.getResolver(this.ceramic),
    }
    this.ceramic.setDID(new DID({ resolver }))
    this.ceramic.did?.setProvider(provider)
    const authenticatedDID = await this.ceramic.did?.authenticate()    
    await this.initializeMasterSeed(prvKey, pubKey, label)
    return authenticatedDID
  }

  /**
   * Add the given private key as another authSecret that can access the DID seed
   * @param newPrvKey the new key to be added inside the keychain
   * @param pubKey the public key derived from prvkey that will be used as authId
   */
  async addAuthenticator(newPrvKey: string, pubKey: string, label: string): Promise<any> {
    const newAuthSecret = Buffer.from(newPrvKey, "hex")
    
    await this.threeIdProvider.keychain.add(pubKey, newAuthSecret)
    await this.threeIdProvider.keychain.commit()
    const doc = await this.getMeta()
    const content = <Record<string, any>>doc.content

    content.authenticators[pubKey] = label
    content.keys[pubKey] = await this.encrypt({prvkey: newPrvKey})

    await doc.update({ ...content })
    return this.threeIdProvider
  }

  /**
   * Return the decrypted master seed
   * @returns string
   */
  async getMasterSeed(): Promise<string> {
    const doc = await this.getMeta()
    const tileContent = <Record<string, any>>doc.content   
   
    const decryptedMastedSeed = await this.decrypt(tileContent.masterSeed)

    return decryptedMastedSeed?.prvkey
  }

  async getProviderKeyPair(provider: string): Promise<{privateKey: string, publicKey:string} | undefined> {
    const doc = await this.getMeta()
    const tileContent = <Record<string, any>>doc.content
    const entry = Object.entries(tileContent.authenticators).find(_ => _[1] === provider)
    if(entry)
    {
      const publicKey = entry[0]
      const privateKey = await this.decrypt(tileContent.keys[publicKey])
      return {publicKey, privateKey: privateKey.prvkey}
    }
  }
  /**
   * Remove the provided authenticator
   * @param pubKey the public key derived from prvkey that will be used as authId
   * @returns bool
   */
  async removeAuthenticator(pubKey: string): Promise<any> {
    await this.threeIdProvider.keychain.remove(pubKey)
    await this.threeIdProvider.keychain.commit()
    const doc = await this.getMeta()
    const content = <Record<string, any>>doc.content

    delete content.authenticators[pubKey]
    delete content.keys[pubKey]

    await doc.update({ ...content })

    return this.threeIdProvider
  }
}
