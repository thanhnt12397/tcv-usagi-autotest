FROM node:20.14.0-slim
WORKDIR /var/usagi

RUN npx playwright install --with-deps
RUN apt update && apt install -y apache2-utils

CMD ["bash"]
