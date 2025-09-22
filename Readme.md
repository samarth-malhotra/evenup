-- To add or update color make changes in ./theme/token.js file, and once done run command, npm run sync:tokens It will generate new css version which tailwind config will use internally.
-- To include, any env variable, follow below steps
--- first add in .env file
--- make a entry of the same in 'extra' of app.config.js and read the value from env
--- then update 'config.ts' to include the key

-- For jotai
--- persistedAtom → for anything that must survive app restarts. Ex- users, token
--- create a local storage key name under src/store/storageKeys.ts and then use in persistedAtom.
--- atom → for in-memory state only.
