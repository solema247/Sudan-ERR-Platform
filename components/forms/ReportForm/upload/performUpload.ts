import { supabase } from "../../../../services/supabaseClient"
import * as tus from "tus-js-client";

const supabaseProjectId = "inrddslmakqrezinnejh";
const bucketName = "images"
const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

const { data: { session } } = await supabase.auth.getSession()

interface UploadCallbacks {
    onProgress: any,
    onSuccess: any,
    onError: any
}

export default async function uploadFile(fileName: string, file: File, { onProgress, onSuccess, onError }: UploadCallbacks ) {
    return new Promise((resolve, reject) => {
        var upload = new tus.Upload(file, {
            endpoint: `https://${supabaseProjectId}.supabase.co/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
                authorization: `Bearer ${key}`,
                'x-upsert': 'true', // optionally set upsert to true to overwrite existing files
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true, // Important if you want to allow re-uploading the same file https://github.com/tus/tus-js-client/blob/main/docs/api.md#removefingerprintonsuccess
            metadata: {
                bucketName: bucketName,
                objectName: fileName,
                contentType: 'image/png',
                cacheControl: '3600'
            },
            chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
            onError: function (error) {
                console.log('Failed because: ' + error)
                reject(error)
            },
            onProgress: function (bytesUploaded, bytesTotal) {
                var percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2)
                console.log(bytesUploaded, bytesTotal, percentage + '%')
                if (onProgress) onProgress(percentage)
            },
            onSuccess: function () {
                console.log("Uploaded: " + upload.url)
                if (onSuccess) onSuccess(upload.url)
                resolve(true)   // TODO: Check that this is the return resolution we want.
            },
        })

        return upload.findPreviousUploads().then(function (previousUploads) {
            // Found previous uploads so we select the first one.
            if (previousUploads.length) {
                upload.resumeFromPreviousUpload(previousUploads[0])
            }

            // Start the upload
            upload.start()
        })
    })
}