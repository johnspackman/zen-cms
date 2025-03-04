FROM ubuntu:20.04

RUN apt-get update -y && apt-get install -y wget vim sudo iputils-ping

RUN groupadd -r pptruser && \
    useradd -m -r -g pptruser pptruser

RUN mkdir -p /home/pptruser/Downloads /home/pptruser/app
WORKDIR /home/pptruser/
COPY container/* .
COPY container/app/* app/
COPY container/bin/* bin/

RUN usermod -aG pptruser pptruser && \
    chown -R pptruser:pptruser /home/pptruser

# lie about the home dir to avoid needing to setup permissions for below RUNs
ENV HOME=/home/pptruser
ENV NODE_VERSION=v20.18.0
ENV NVM_HOME=$HOME/.nvm
ENV PATH=$NVM_HOME/versions/node/$NODE_VERSION/bin:$PATH

RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && \
    . $NVM_HOME/nvm.sh && \
    nvm install $NODE_VERSION

WORKDIR /home/pptruser/app
RUN npm ci
RUN npx -y playwright-core@^1.48.0 install --with-deps chromium
RUN chown -R pptruser:pptruser "/home/pptruser/.npm"
RUN chown -R pptruser:pptruser "/home/pptruser/app"

USER pptruser

CMD ["/bin/bash", "/home/pptruser/bin/start.sh"]

EXPOSE 9000
EXPOSE 9229
