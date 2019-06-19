build:
	docker build -t theorm/histograph .

run:
	docker run \
		--rm -it \
		-p 8000:8000 \
		--name histograph \
		-v $(PWD)/settings.js:/histograph/settings.js \
		-v $(PWD)/contents:/histograph/contents \
		theorm/histograph \
		node server.js