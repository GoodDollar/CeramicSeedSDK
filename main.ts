import { CeramicClient } from '@ceramicnetwork/http-client'
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver'
import { TileDocument } from '@ceramicnetwork/stream-tile';

import { encrypt, decrypt, getPublic } from "@toruslabs/eccrypto"

import ThreeIdProvider from '3id-did-provider'
import { DID } from 'dids'
import { Ecies } from 'eccrypto';
export class CeramicSDK {
    threeIdProvider!: ThreeIdProvider
    ceramic: CeramicClient;
    authId!: string;

    constructor(networkUrl: string){
        this.ceramic = new CeramicClient(networkUrl);
    }

    async getPermission(request: any){
        return request.payload.paths;
    }

    /**
     * Creates or retrieves a TileDocument containing the master seed field
     * 
     * @param publickey 
     * @param prvkey the data to store inside masterSeed field
     * @param did a DID that will control the stream
     */
    async initializeMasterSeed(prvkey: any) {
        const doc = await TileDocument.deterministic(
            this.ceramic,
            { family: "masterSeed", 
              tags: ["v1"],
              controllers: [this.ceramic.did?.id as string]
             }
        );

        const docType =  doc.content as Record<string, any>;

        if (docType.masterSeed) {
            return doc;
        }

        const seed = this.threeIdProvider.keychain._keyring.seed;
        const publicKeySeed = getPublic(Buffer.from(seed));
        const encryptedData = await this.encrypt(publicKeySeed, prvkey);

        await doc.update({masterSeed: encryptedData});      
        return doc; 
    }

    async encrypt(publicKey: any, dataToEncrypt: any): Promise<any>{
        const encrypted = await encrypt(Buffer.from(publicKey), Buffer.from(dataToEncrypt));
        return encrypted;
    }

    async decrypt(privateKey: any, encryptedData: any): Promise<any> {
        const decrypted = await decrypt(privateKey, encryptedData);
        return decrypted;
    }

    /**
     * Initialize a DID based on private key and create a new one if none exists
     * Will also encrypt the private key and store it inside masterSeed field
     * @param prvKey the private key to use to create a new DID
     * @param pubKey the public key derived from prvkey that will be used as authId
     * @returns string
     */
     async initialize(prvKey: string, pubKey: string): Promise<any> {
        const authSecret = Buffer.from(prvKey);
        this.authId = pubKey;
        const config = {
            getPermission: this.getPermission,  
            ceramic: this.ceramic,
            authId: this.authId,
            authSecret
        }
        this.threeIdProvider = await ThreeIdProvider.create(config);
        const provider = this.threeIdProvider.getDidProvider();
        const resolver = ThreeIdResolver.getResolver(this.ceramic);
        this.ceramic.did = new DID({ provider, resolver });
        const authenticatedDID = await this.ceramic.did.authenticate();
        
        await this.initializeMasterSeed(prvKey);
        return authenticatedDID;
    } 

    /**
     * Add the given private key as another authSecret that can access the DID seed
     * @param newPrvKey the new key to be added inside the keychain
     * @param pubKey the public key derived from prvkey that will be used as authId
     */
    async addAuthenticator(newPrvKey: string, pubKey: string): Promise<any> {
        const newAuthSecret = Buffer.from(newPrvKey);
        await this.threeIdProvider.keychain.add(pubKey, newAuthSecret);
        await this.threeIdProvider.keychain.commit();
        return this.threeIdProvider;
    }

    /**
     * Return the decrypted master seed
     * @returns string
     */
    async getMasterSeed(): Promise<string> {
        const doc = await TileDocument.deterministic(
            this.ceramic,
            { family: "masterSeed",
              tags: ["v1"],
              controllers: [this.ceramic.did?.id as string],
             },
             { anchor: false, publish: false }
        );
        const tileContent = <Record<string, any>>doc.content;

        const ecies : Ecies = {
            iv: Buffer.from(tileContent.masterSeed.iv.data),
            ephemPublicKey: Buffer.from(tileContent.masterSeed.ephemPublicKey.data),
            ciphertext: Buffer.from(tileContent.masterSeed.ciphertext.data),
            mac: Buffer.from(tileContent.masterSeed.mac.data)
        }

        const seed = Buffer.from(this.threeIdProvider.keychain._keyring.seed);
        const decryptedMastedSeed = await this.decrypt(seed, ecies);
        
        return decryptedMastedSeed.toString();
    }

    /**
     * Remove the provided authenticator
     * @param pubKey the public key derived from prvkey that will be used as authId
     * @returns bool 
     */
    async removeAuthenticator(pubKey: string): Promise<any> {
        await this.threeIdProvider.keychain.remove(pubKey);
        await this.threeIdProvider.keychain.commit();
        return this.threeIdProvider;
    }
}