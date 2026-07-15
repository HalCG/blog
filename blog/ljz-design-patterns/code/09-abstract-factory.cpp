// g++ -std=c++17 -o demo 09-abstract-factory.cpp
#include <iostream>
#include <memory>

class Button {
public:
  virtual void paint() = 0;
  virtual ~Button() = default;
};
class ScrollBar {
public:
  virtual void scroll() = 0;
  virtual ~ScrollBar() = default;
};

class WinButton : public Button {
public:
  void paint() override { std::cout << "Win button\n"; }
};
class WinScrollBar : public ScrollBar {
public:
  void scroll() override { std::cout << "Win scroll\n"; }
};

class GUIFactory {
public:
  virtual std::unique_ptr<Button> createButton() = 0;
  virtual std::unique_ptr<ScrollBar> createScrollBar() = 0;
  virtual ~GUIFactory() = default;
};

class WinFactory : public GUIFactory {
public:
  std::unique_ptr<Button> createButton() override {
    return std::make_unique<WinButton>();
  }
  std::unique_ptr<ScrollBar> createScrollBar() override {
    return std::make_unique<WinScrollBar>();
  }
};

int main() {
  WinFactory factory;
  auto btn = factory.createButton();
  auto bar = factory.createScrollBar();
  btn->paint();
  bar->scroll();
  return 0;
}
