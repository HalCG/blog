// g++ -std=c++17 -o demo 15-proxy.cpp
#include <iostream>
#include <memory>
#include <string>

class Image {
public:
  virtual void display() = 0;
  virtual ~Image() = default;
};

class RealImage : public Image {
  std::string file_;
  void load() { std::cout << "load " << file_ << "\n"; }
public:
  explicit RealImage(std::string f) : file_(std::move(f)) { load(); }
  void display() override { std::cout << "show " << file_ << "\n"; }
};

class ImageProxy : public Image {
  std::string file_;
  std::unique_ptr<RealImage> real_;
public:
  explicit ImageProxy(std::string f) : file_(std::move(f)) {}
  void display() override {
    if (!real_) real_ = std::make_unique<RealImage>(file_);
    real_->display();
  }
};

int main() {
  ImageProxy img("photo.png");
  std::cout << "proxy created\n";
  img.display();
  return 0;
}
