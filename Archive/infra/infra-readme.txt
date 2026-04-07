Login Docker to ECR:
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 510151297987.dkr.ecr.ap-southeast-2.amazonaws.com

BuildDocker image
cd backend
TIMESTAMP_TAG=$(date +%d%m%y%H%M)
echo "Generated timestamp tag: $TIMESTAMP_TAG"
docker build -t sqlinj-backend:$TIMESTAMP_TAG .
docker tag sqlinj-backend:$TIMESTAMP_TAG 510151297987.dkr.ecr.ap-southeast-2.amazonaws.com/my-sqlinj-backend:$TIMESTAMP_TAG
docker tag sqlinj-backend:$TIMESTAMP_TAG 510151297987.dkr.ecr.ap-southeast-2.amazonaws.com/my-sqlinj-backend:latest
