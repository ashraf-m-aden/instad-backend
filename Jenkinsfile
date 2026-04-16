pipeline {
    agent any

    environment {
        LOCAL_PATH = '/home/ubuntu/instad-backend'
    }

    options {
        disableConcurrentBuilds()
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    triggers {
        githubPush()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    def hasPrev = sh(
                        script: 'git rev-parse HEAD~1 2>/dev/null && echo yes || echo no',
                        returnStdout: true
                    ).trim()
                    env.FIRST_BUILD = (hasPrev == 'no') ? 'true' : 'false'
                    env.PREV_COMMIT = (env.FIRST_BUILD == 'false')
                        ? sh(script: 'git rev-parse HEAD~1', returnStdout: true).trim()
                        : ''
                    echo "Commit : ${env.GIT_COMMIT?.take(7)}"
                }
            }
        }

        stage('Sync local repo') {
            steps {
                sh """
                    sudo chown -R jenkins:hms ${env.LOCAL_PATH}
                    sudo chmod -R g+rwX ${env.LOCAL_PATH}
                    cd ${env.LOCAL_PATH}
                    git fetch origin main
                    git reset --hard origin/main
                    echo "Local repo mis a jour"
                """
            }
        }

  

        stage('Restart PM2 services') {
                    steps {
                        sh """
                            cd ${env.LOCAL_PATH}
                            npm install --omit=dev
                            PM2_HOME=/home/ubuntu/.pm2 pm2 restart instad-backend
                            echo "instad backend restarted"
                        """
                    }
                
                
            
        }
        

        stage('Healthcheck') {
            steps {
                sleep(time: 10, unit: 'SECONDS')
                sh """
                    echo "=== PM2 ==="
                    PM2_HOME=/home/ubuntu/.pm2 pm2 list
                    sudo chown -R ubuntu:instad ${env.LOCAL_PATH}
                """
            }
        }
    }

    post {
        success { echo "INSTAD Pipeline OK - ${env.GIT_COMMIT?.take(7)} deploye" }
        failure { echo "INSTAD Pipeline ECHEC" }
    }
}