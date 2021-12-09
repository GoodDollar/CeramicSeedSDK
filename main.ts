import { randomString } from '@stablelib/random'
import { CeramicClient } from '@ceramicnetwork/http-client'
import KeyDidResolver from 'key-did-resolver'
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver'
import { Ed25519Provider } from 'key-did-provider-ed25519'

import ThreeIdProvider from '3id-did-provider'


import { DID } from 'dids'


const NODE_URL_3BOXLABS = 'https://ceramic-clay.3boxlabs.com';
const NODE_URL_TESTNET = 'https://gateway-clay.ceramic.network';
const NODE_URL_MAINNET = 'https://gateway.ceramic.network';

const ceramic = new CeramicClient(NODE_URL_3BOXLABS);

const getPermission = async (request: any) => {
    return request.payload.paths
}

/**
 * Initialize a DID based on private key and create a new one if none exists
 * Will also encrypt the private key and store it inside masterSeed field
 * @param prvkey 
 * @returns
 */
export async function initialize(prvKey: string): Promise<any> {
    const authId = prvKey;  
    const authSecret = Buffer.from(prvKey);
    const threeIdProvider = await ThreeIdProvider.create({
        getPermission,  
        ceramic,
        authId,
        authSecret,
    });

    const provider = threeIdProvider.getDidProvider();
    const resolver = ThreeIdResolver.getResolver(ceramic);
    const did = new DID({ provider, resolver });
    ceramic.did = did;
    const res = await ceramic.did.authenticate();
    // Now encrypt to prvkey with the master seed and store it inside a field `masterSeed`
    return {authId, did: res, provider: threeIdProvider};
} 

/**
 * Add the given private key as another authSecret that can access the DID seed
 * @param prvKey an authSecret already present inside the keychain
 * @param newPrvKey the new key to be added inside the keychain
 */
export async function addAuthenticator(prevAuthId: string, prvKey: string, newPrvKey: string): Promise<void> {
    const authId = prvKey;
    const authSecret = Buffer.from(prvKey);
    const newAuthSecret = Buffer.from(newPrvKey);
    const threeIdProvider = await ThreeIdProvider.create({
        getPermission,  
        ceramic,
        authSecret,
        authId: prevAuthId,
    });

    await threeIdProvider.keychain.add(authId, newAuthSecret);
    await threeIdProvider.keychain.commit();
}

/**
 * Return the decrypted master seed
 * @returns 
 */
export function getMasterSeed(): any {

}

/**
 * Remove the provided authenticator
 * @param prvKey the authenticator private key to be removed from the keychain
 * @returns bool 
 */
export async function removeAuthenticator(prvKey: string): Promise<any> {
    const authId = prvKey;
    const authSecret = Buffer.from(prvKey);
    const threeIdProvider = await ThreeIdProvider.create({
        getPermission,  
        ceramic,
        authSecret,
        authId,
    });
    await threeIdProvider.keychain.remove(authId);
    await threeIdProvider.keychain.commit();
    return threeIdProvider;
}