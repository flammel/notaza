import * as dotenv from 'dotenv';

dotenv.config();
const config = {
    contentDir: process.env.NOTAZA_CONTENT_DIRECTORY as string,
    port: process.env.NOTAZA_PORT as string,
};
export default config;
