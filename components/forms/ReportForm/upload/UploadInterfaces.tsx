export type FilesDictionary = Record<string, FileWithProgress[]>;

export interface FileWithProgress {
    file: File;
    uploaded: boolean;
    progress: number;
  }