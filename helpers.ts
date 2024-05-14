import { parseString } from 'xml2js';

export async function parseXmlResponse<T>(xmlData: string): Promise<T> {
  return new Promise((resolve, reject) => {
    parseString(xmlData, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result as T);
      }
    });
  });
}

export function isValidURL(url: string): boolean {
  const urlPattern = /^https?:\/\/\S+$/i;
  return urlPattern.test(url);
}
