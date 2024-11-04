
import cv2
image = cv2.imread("/home/runner/Sudan-ERR-Chatbot-Nextjs/uploads/Filled F4 Form.jpg")
gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
blurred_image = cv2.GaussianBlur(gray_image, (5, 5), 0)
adjusted_image = cv2.convertScaleAbs(blurred_image, alpha=1.5, beta=0)
cv2.imwrite("/home/runner/Sudan-ERR-Chatbot-Nextjs/uploads/Filled F4 Form-processed.jpg", adjusted_image)
