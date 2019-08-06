node {
    def baseImageName = 'photic-docker-node'

    def tagPrefix;
    switch ("${env.sha1}") {
        case ~/^.*photic-0.0.1$/: tagPrefix = 'it'; break
        case ~/^.*\/.*$/: tagPrefix = 'pr'; break
        default: tagPrefix = "br-${env.sha1}"; break
    }

    try {
        checkout scm

        docker.withRegistry("https://${env.DOCKER_REGISTRY}", "${env.DOCKER_CREDENTIALS}") {
            stage("Pull $baseImageName") {
              baseImage = docker.image("$baseImageName")
              baseImage.pull()
            }

            stage("test") {
              def pwd = pwd()
              baseImage.inside("--volume=${pwd}/packages/anonymous.js:/usr/local/src") {
                  sh "cd /usr/local/src && npm i && npm t"
              }
            }

            // stage("Check for Node JS high severity vulnerabilities") {
            //     step([$class: 'LogParserPublisher',
            //     failBuildOnError: true,
            //     parsingRulesPath: '/home/ubuntu/parsing_rules/node_vulnerability.txt',
            //     useProjectRule: false])
            // }

            // The 'sha1' environment variable contains the branch details.
            // We only want to push if the branch is master (or origin/master etc.)
            if ("$tagPrefix" == 'it') {
                stage('Push NPM module (master or branch build)') {
                    def pwd = pwd()
                    baseImage.inside("--volume=${pwd}/packages/anonymous.js:/usr/local/src") {
                        // Set the local package.json to the latest remote version, then patch
                        def npmVersion = "npm version --no-git-tag-version --allow-same-version"
                        // execute the publish commands inside the photic-docker-node instance
                        sh "cd /usr/local/src && $npmVersion \$(npm show $npmPackage version) && $npmVersion patch && npm publish"
                    }
                }
            }
        }
    }
    catch(Exception e) {
        throw e;
    }
}