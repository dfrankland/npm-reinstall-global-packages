import childProcess from 'child_process';

const execPromise = command =>
  new Promise(
    resolve =>
      childProcess.exec(command,
        (err, stdout, stderr) =>
          resolve({ err, stdout, stderr })
      )
  );

const getGlobalPackages = async () => {
  const { stdout } = await execPromise('npm ll --global --json --depth=0');
  const { dependencies } = JSON.parse(stdout);
  return Object.keys(dependencies).reduce(
    (allDependencies, dependency) => {
      const { name, version, peerMissing, link } = dependencies[dependency];
      if (peerMissing || link || name === 'npm' || !version) {
        if (link) console.log(`Skipping linked global package \`${name}\``);
        if (peerMissing) console.error(`Missing global peer dependency \`${name}\``);
        if (!version) console.error(`Skipping global package \`${name}\` because version information is missing`);
        return allDependencies;
      }

      return allDependencies.concat({ name, version });
    }, []
  );
};

const spawnNpmPromise = (globalPackages, args, version) =>
  new Promise(
    (resolve, reject) => {
      const npmArguments = globalPackages.reduce(
        (allArguments, { name, version: v }) => allArguments.concat(name + (version ? `@${v}` : '')),
        args
      );
      console.log(`\nRunning command:\nnpm ${npmArguments.join(' ')}`);
      try {
        const spawnedProcess = childProcess.spawn('npm', npmArguments, { stdio: 'inherit' });
        spawnedProcess.on('error', reject);
        spawnedProcess.on('close', resolve);
      } catch (err) {
        reject(err);
      }
    }
  );

try {
  (async () => {
    const globalPackages = await getGlobalPackages();
    await spawnNpmPromise(globalPackages, ['uninstall', '--global']);
    await spawnNpmPromise(globalPackages, ['install', '--global'], true);
  })();
} catch (err) {
  throw new Error(err);
}
