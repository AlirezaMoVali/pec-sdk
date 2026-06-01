import soap from 'soap';
import { PecTransportError } from './errors.js';

const clientCache = new Map<string, Promise<soap.Client>>();

export async function getSoapClient(wsdlUrl: string): Promise<soap.Client> {
  let cached = clientCache.get(wsdlUrl);
  if (!cached) {
    cached = soap.createClientAsync(wsdlUrl).catch((error: unknown) => {
      clientCache.delete(wsdlUrl);
      throw new PecTransportError(`Failed to create SOAP client for ${wsdlUrl}`, error);
    });
    clientCache.set(wsdlUrl, cached);
  }

  return cached;
}

export async function callSoapMethod<T>(
  wsdlUrl: string,
  methodName: string,
  args: Record<string, unknown>
): Promise<T> {
  try {
    const client = await getSoapClient(wsdlUrl);
    const method = (client as Record<string, unknown>)[methodName];

    if (typeof method !== 'function') {
      throw new PecTransportError(`SOAP method "${methodName}" was not found in ${wsdlUrl}`);
    }

    const asyncMethod = method as (
      args: Record<string, unknown>
    ) => Promise<[T, string | undefined, unknown, string]>;

    const [result] = await asyncMethod.call(client, args);
    return result;
  } catch (error: unknown) {
    if (error instanceof PecTransportError) {
      throw error;
    }
    throw new PecTransportError(`SOAP call "${methodName}" failed`, error);
  }
}

/** Clears cached SOAP clients (useful in tests). */
export function clearSoapClientCache(): void {
  clientCache.clear();
}
