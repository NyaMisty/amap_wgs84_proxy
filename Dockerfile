FROM node:20-bookworm

ADD package.json /opt/node_root/
ADD package-lock.json /opt/node_root/

RUN cd /opt/node_root && npm i

ENV NODE_PATH /opt/node_root/node_modules

EXPOSE 5000

WORKDIR /opt/node_root
CMD cd /opt/node_root && node --import tsx /workdir/index.js