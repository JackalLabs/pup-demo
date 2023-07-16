import {
  CustomWallet,
  WalletHandler,
  FileUploadHandler,
  cryptString,
  genIv,
  genKey
} from 'jackal.nodejs'
import type {
  IFileDownloadHandler, IUploadList
} from 'jackal.nodejs'
import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import ErrnoException = NodeJS.ErrnoException

// const { WalletHandler } = require('jackal.js')

const signerChain = 'lupulella-2'
const testnet = {
  signerChain,
  enabledChains: [signerChain],
  queryAddr: 'https://testnet-grpc.jackalprotocol.com',
  txAddr: 'https://testnet-rpc.jackalprotocol.com',
  chainConfig: {
    chainId: signerChain,
    chainName: 'Jackal Testnet II',
    rpc: 'https://testnet-rpc.jackalprotocol.com',
    rest: 'https://testnet-api.jackalprotocol.com',
    bip44: {
      coinType: 118
    },
    coinType: 118,
    stakeCurrency: {
      coinDenom: 'JKL',
      coinMinimalDenom: 'ujkl',
      coinDecimals: 6
    },
    bech32Config: {
      bech32PrefixAccAddr: 'jkl',
      bech32PrefixAccPub: 'jklpub',
      bech32PrefixValAddr: 'jklvaloper',
      bech32PrefixValPub: 'jklvaloperpub',
      bech32PrefixConsAddr: 'jklvalcons',
      bech32PrefixConsPub: 'jklvalconspub'
    },
    currencies: [
      {
        coinDenom: 'JKL',
        coinMinimalDenom: 'ujkl',
        coinDecimals: 6
      }
    ],
    feeCurrencies: [
      {
        coinDenom: 'JKL',
        coinMinimalDenom: 'ujkl',
        coinDecimals: 6,
        gasPriceStep: {
          low: 0.002,
          average: 0.002,
          high: 0.02
        }
      }
    ],
    features: []
  }
}

const fileName = 'app.toml.txt'
//
// interface IFileConfigRaw {
//   address: string // merkle path of entire file
//   contents: string // contents (fid usually)
//   owner: string // hashed (uuid + owner)
//   editAccess: string // IEditorsViewers, // object of sha256 hash of wallet address:enc aes key
//   viewingAccess: string // IEditorsViewers, // object of sha256 hash of wallet address:enc aes key
//   trackingNumber: string // uuid
// }
// interface IAesBundle {
//   iv: Uint8Array
//   key: CryptoKey
// }
// interface IFileMeta {
//   name: string
//   lastModified: number
//   size: number
//   type: string
// }
// interface IFileUploadHandler {
//   isFolder: boolean
//
//   setIds(idObj: { cid: string; fid: string[] }): void
//   setUUID(uuid: string): void
//   getIds(): { fid: string[]; cid: string }
//   getUUID(): string
//   getWhoAmI(): string
//   getWhereAmI(): string
//   getForUpload(aes?: IAesBundle): Promise<File>
//   getForPublicUpload(): File
//   getEnc(): Promise<IAesBundle>
//   getMerklePath(): Promise<string>
//   getMeta(): IFileMeta
//   getFullMerkle(): Promise<string>
// }
//
// interface IUploadListItem {
//   data: null | IFileConfigRaw
//   exists: boolean
//   handler: IFileUploadHandler
//   key: string
//   uploadable: File
// }
// interface IUploadList {
//   [key: string]: IUploadListItem
// }

// async function runQuery() {
//   console.log('hello world')
//   const w = await WalletHandler.trackQueryWallet(testnet.queryAddr)
//   console.log(w)
//   console.log('hello world again')
//   const r = await w.makeRnsHandler()
//   console.log(await r.findAllForSaleNames())
// }

async function run() {
  const c = await CustomWallet.create('capital chunk piano supreme photo beef age boy retire vote kitchen under')
  const w = await WalletHandler.trackWallet({ selectedWallet: 'custom', ...testnet }, { customWallet: c })

  const iv = genIv()
  const key = await genKey()
  const test = 'hello world'
  const enc = await cryptString(test, key, iv, 'encrypt')
  console.log('enc:', enc)
  const dec = await cryptString(enc, key, iv, 'decrypt')
  console.log('dec:', dec)

  // console.log(await w.getJackalBalance())
  // const r = await w.makeRnsHandler()
  // console.log(await r.findMyExistingNames())

  const fileIo = await w.makeFileIoHandler('1.0.9')
  if (!fileIo) throw new Error('no FileIo')

  const sampleDir = 'Node3'

  await fileIo.generateInitialDirs(null, [sampleDir])

  await fileIo.verifyFoldersExist([sampleDir])
  const dir = await fileIo.downloadFolder("s/" + sampleDir)
  console.log('initial s/Node files')
  console.log(dir.getChildFiles())

  fs.readFile(`./test-files/${fileName}`, async function (err: ErrnoException | null, f: Buffer) {
    console.log('In Read!')
    if (err) console.error(err)
    console.log('Opened!')
    console.log(f)
    const toUpload = new File([f], fileName, {type: "text/plain"});

    // @ts-ignore
    const handler = await FileUploadHandler.trackFile(toUpload, dir.getMyPath())

    const uploadList: IUploadList = {}
    uploadList[fileName] =  {
      data: null,
      exists: false,
      handler: handler,
      key: fileName,
      uploadable: handler.getForPublicUpload()
    }

    const tracker = {timer: 0, complete: 0}
    await fileIo.staggeredUploadFiles(uploadList, dir, tracker)

    const dirAgain = await fileIo.downloadFolder("s/" + sampleDir)
    console.log('post upload s/Node files')
    console.log(dirAgain.getChildFiles)

    const dl = await fileIo.downloadFile({
      rawPath: dirAgain.getMyPath() + fileName,
      owner: w.getJackalAddress()
      },
    {
      track: 0
    }) as IFileDownloadHandler

    fs.writeFile(fileURLToPath(new URL('./test-files/dl', fileName)), new Uint8Array(await dl.receiveBacon().arrayBuffer()), {}, () => {})

  })
}

// runQuery()
//   .then(() => console.log('done'))
//   .then(() => {
//     console.log('waiting')
//     while (true) continue
//   })

run()
  .then(() => console.log('done'))
  .then(() => {
    console.log('waiting')
    while (true) continue
  })
