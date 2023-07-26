import * as fs from 'node:fs'
import {
  MnemonicWallet,
  WalletHandler,
  FileUploadHandler,
  cryptString,
  genIv,
  genKey
} from '@jackallabs/jackal.nodejs'
import type {
  IFileDownloadHandler, IUploadList
} from '@jackallabs/jackal.nodejs'
import ErrnoException = NodeJS.ErrnoException

const mnemonic = 'capital chunk piano supreme photo beef age boy retire vote kitchen under'
const fileName = 'app.toml3.txt'
const sampleDir = 'Node3'
const runVerify = true
// const runVerify = false
// const downloadOnly = true
const downloadOnly = false

const signerChain = 'lupulella-2'
const testnet = {
  signerChain,
  queryAddr: 'https://testnet-grpc.jackalprotocol.com',
  txAddr: 'https://testnet-rpc.jackalprotocol.com'
}

async function verifyCrypt() {
  const iv = genIv()
  const key = await genKey()
  const test = 'hello world'
  const enc = await cryptString(test, key, iv, 'encrypt')
  console.log('enc:', enc)
  const dec = await cryptString(enc, key, iv, 'decrypt')
  console.log('dec:', dec)
}

async function run() {
  const m = await MnemonicWallet.create(mnemonic)
  const w = await WalletHandler.trackWallet(testnet, m)

  const fileIo = await w.makeFileIoHandler('1.0.9')
  if (!fileIo) throw new Error('no FileIo')

  fileIo.forceProvider({
    address: 'string',
    ip: 'https://testnet5.jwillette.net',
    totalspace: 'string',
    burnedContracts: 'string',
    creator: 'string',
    keybaseIdentity: 'string',
    authClaimers: []
  })

  await fileIo.generateInitialDirs(null, [sampleDir])

  await fileIo.verifyFoldersExist([sampleDir])
  const dir = await fileIo.downloadFolder("s/" + sampleDir)

  fs.readFile(`./test-files/${fileName}`, async function (err: ErrnoException | null, f: Buffer) {
    if (err) console.error(err)
    const toUpload = new File([f], fileName, {type: "text/plain"});

    // @ts-ignore
    const handler = await FileUploadHandler.trackFile(toUpload, dir.getMyPath())

    const uploadList: IUploadList = {}
    uploadList[fileName] =  {
      data: null,
      exists: false,
      handler: handler,
      key: fileName,
      uploadable: await handler.getForUpload()
    }

    const tracker = {timer: 0, complete: 0}
    await fileIo.staggeredUploadFiles(uploadList, dir, tracker)

    const dirAgain = await fileIo.downloadFolder("s/" + sampleDir)
    const dl = await fileIo.downloadFile({
      rawPath: dirAgain.getMyChildPath(fileName),
      owner: w.getJackalAddress()
      },
    {
      track: 0
    }) as IFileDownloadHandler

    fs.writeFileSync(
      `./test-files/dl/${fileName}`,
      new Uint8Array(await dl.receiveBacon().arrayBuffer()),
      {}
    )
  })
}

async function tryDownload() {
  const m = await MnemonicWallet.create(mnemonic)
  const w = await WalletHandler.trackWallet(testnet, m)
  const fileIo = await w.makeFileIoHandler('1.0.9')
  if (!fileIo) throw new Error('no FileIo')

  const dirAgain = await fileIo.downloadFolder("s/" + sampleDir)
  const dl = await fileIo.downloadFile({
      rawPath: dirAgain.getMyChildPath(fileName),
      owner: w.getJackalAddress()
    },
    {
      track: 0
    }) as IFileDownloadHandler

  fs.writeFileSync(
    `./test-files/dl/${fileName}`,
    new Uint8Array(await dl.receiveBacon().arrayBuffer()),
    {}
  )
}

(async function() {
  if (runVerify) {
    await verifyCrypt()
      .then(() => {
        console.log('verifyCrypt() Done')
      })
  }
  if (downloadOnly) {
    await tryDownload()
      .then(() => {
        console.log('tryDownload() Done')
      })
  } else {
    await run()
      .then(() => {
        console.log('run() Done')
      })
  }
})()
