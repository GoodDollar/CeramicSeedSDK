import { CeramicClient } from '@ceramicnetwork/http-client'
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver'

import ThreeIdProvider from '3id-did-provider'
import { DID } from 'dids'
export class CeramicSDK {
    threeIdProvider!: ThreeIdProvider
    ceramic: CeramicClient;
    authId: string;

    constructor(networkUrl: string, pubKey: string){
        this.ceramic = new CeramicClient(networkUrl);
        this.authId = pubKey;
    }

    async getPermission(request: any){
        return request.payload.paths;
    }

    /**
     * Initialize a DID based on private key and create a new one if none exists
     * Will also encrypt the private key and store it inside masterSeed field
     * @param prvKey the private key to use to create a new DID
     * @returns ThreeIdProvider
     */
     async initialize(prvKey: string): Promise<any> {
        const authSecret = Buffer.from(prvKey);
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
        // Now encrypt to prvkey with the master seed and store it inside a field `masterSeed`
        return authenticatedDID;
    } 

    /**
     * Add the given private key as another authSecret that can access the DID seed
     * @param newPrvKey the new key to be added inside the keychain
     * @param authId a derived key from the newPrvkey to be used a authId
     */
    async addAuthenticator(newPrvKey: string, authId: string): Promise<any> {
        const newAuthSecret = Buffer.from(newPrvKey);
        await this.threeIdProvider.keychain.add(authId, newAuthSecret);
        await this.threeIdProvider.keychain.commit();
        return this.threeIdProvider;
    }

    /**
     * Return the decrypted master seed
     * @returns 
     */
    getMasterSeed(): any {
         return "";
    }

    /**
     * Remove the provided authenticator
     * @param authId the authenticator ID of the private key to be removed from the keychain
     * @returns bool 
     */
    async removeAuthenticator(authId: string): Promise<any> {
        await this.threeIdProvider.keychain.remove(authId);
        await this.threeIdProvider.keychain.commit();
        return this.threeIdProvider;
    }
}