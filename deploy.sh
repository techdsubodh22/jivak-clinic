#!/usr/bin/env bash
# Usage: ./deploy.sh <registry/image-name> [tag]
# Example: ./deploy.sh myuser/test-subodh 1.0.0
set -e

REGISTRY=${1:?Usage: ./deploy.sh <registry/image-name> [tag]}
TAG=${2:-latest}
IMAGE="$REGISTRY:$TAG"

echo "==> Building image: $IMAGE"
docker build -t "$IMAGE" .

echo "==> Pushing image: $IMAGE"
docker push "$IMAGE"

echo "==> Applying manifests"
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/pvc.yaml

echo "==> Updating deployment image"
sed "s|YOUR_REGISTRY/test-subodh:latest|$IMAGE|g" k8s/deployment.yaml | kubectl apply -f -

kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

echo "==> Rollout status"
kubectl rollout status deployment/test-subodh -n test-subodh

echo "Done. App is live."
