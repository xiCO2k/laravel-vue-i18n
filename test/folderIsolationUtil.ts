import fs from 'fs'
import path from 'path'

export function isolateFolder(folderToIsolate: string, testName: string) {
    const isolatedFolder = folderToIsolate + '_isolated_' + testName;
    copyDirSync(folderToIsolate, isolatedFolder);

    return isolatedFolder;
}

export function removeIsolatedFolder(isolatedFolder: string) {
    fs.rmSync(isolatedFolder, { recursive: true, force: true })
}

function copyDirSync(source: string, destination: string) {
    const exists = fs.existsSync(source);
    const stats = exists && fs.statSync(source);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        fs.mkdirSync(destination);
        fs.readdirSync(source).forEach(childItemName => {
            copyDirSync(path.join(source, childItemName), path.join(destination, childItemName));
        });
    } else {
        fs.copyFileSync(source, destination);
    }
}