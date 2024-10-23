import { Router } from 'express';
import { readdirSync } from 'fs';

const PATH_ROUTER = `${__dirname}`;
const router = Router();

const cleanFileName = (fileName: string): string | undefined => {
  const file = fileName.split('.').shift();
  return file;
};

readdirSync(PATH_ROUTER).filter(fileName => {
  const cleanName = cleanFileName(fileName);
  console.log(cleanName);
  if (cleanName !== 'index') {
    import(`./${cleanName}`).then(moduleRouter => {
      router.use(`/${cleanName}`, moduleRouter.router);
    });
  }
});

export { router };
