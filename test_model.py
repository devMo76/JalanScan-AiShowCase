from ultralytics import YOLO

# Auto-downloads the model from Hugging Face
model = YOLO("https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt")

print("Model loaded!")
print(f"   Classes: {model.names}")
