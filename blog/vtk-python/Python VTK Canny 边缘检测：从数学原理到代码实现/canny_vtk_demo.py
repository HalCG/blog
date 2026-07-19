#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VTK Canny 边缘检测完整示例

依赖: pip install vtk

运行:
    python canny_vtk_demo.py
    python canny_vtk_demo.py --image path/to/your.png
    python canny_vtk_demo.py --low 2 --high 10 --sigma 1.0
"""

from __future__ import annotations

import argparse
from pathlib import Path

import vtkmodules.vtkInteractionStyle  # noqa: F401
import vtkmodules.vtkRenderingFreeType  # noqa: F401
import vtkmodules.vtkRenderingOpenGL2  # noqa: F401
from vtkmodules.vtkCommonExecutionModel import vtkImageToStructuredPoints
from vtkmodules.vtkFiltersCore import vtkStripper, vtkThreshold
from vtkmodules.vtkFiltersGeneral import vtkLinkEdgels, vtkSubPixelPositionEdgels
from vtkmodules.vtkFiltersGeometry import vtkGeometryFilter
from vtkmodules.vtkIOImage import vtkPNGReader
from vtkmodules.vtkImagingColor import vtkImageLuminance
from vtkmodules.vtkImagingCore import vtkImageCast, vtkImageConstantPad
from vtkmodules.vtkImagingGeneral import vtkImageGaussianSmooth, vtkImageGradient
from vtkmodules.vtkImagingMath import vtkImageMagnitude
from vtkmodules.vtkImagingMorphological import vtkImageNonMaximumSuppression
from vtkmodules.vtkImagingSources import vtkImageCanvasSource2D
from vtkmodules.vtkRenderingCore import (
    vtkActor,
    vtkImageMapper,
    vtkPolyDataMapper,
    vtkRenderWindow,
    vtkRenderWindowInteractor,
    vtkRenderer,
)


def create_test_image() -> vtkImageCanvasSource2D:
    """生成一张内置测试图，无需外部数据文件。"""
    source = vtkImageCanvasSource2D()
    source.SetExtent(0, 399, 0, 399, 0, 0)
    source.SetScalarTypeToUnsignedChar()
    source.SetNumberOfScalarComponents(3)

    source.draw_color = (30, 30, 30)
    source.FillBox(0, 399, 0, 399)

    source.draw_color = (220, 220, 220)
    source.FillBox(60, 160, 80, 320)
    source.FillBox(240, 340, 100, 300)

    source.draw_color = (255, 255, 255)
    source.FillCircle(200, 200, 55)

    source.draw_color = (120, 120, 120)
    source.FillCircle(120, 280, 28)
    source.FillCircle(300, 140, 22)

    source.Update()
    return source


def build_canny_pipeline(
    image_source,
    *,
    sigma: float = 1.0,
    low_threshold: float = 2.0,
    high_threshold: float = 10.0,
):
    """
    按 VTK 官方 Canny 示例组装完整管线。

    返回:
        gray_actor: 灰度底图
        edge_actor: 白色边缘折线
        strip: 最终边缘输出（可用于保存/后处理）
    """
    # 1) 灰度化
    luminance = vtkImageLuminance()
    luminance.SetInputConnection(image_source.GetOutputPort())

    # 2) 转 float，避免后续梯度计算精度损失
    image_cast = vtkImageCast()
    image_cast.SetOutputScalarTypeToFloat()
    image_cast.SetInputConnection(luminance.GetOutputPort())

    # 3) 高斯平滑 —— Canny 第一步：降噪
    gaussian = vtkImageGaussianSmooth()
    gaussian.SetInputConnection(image_cast.GetOutputPort())
    gaussian.SetDimensionality(2)
    gaussian.SetRadiusFactors(sigma, sigma, 0)
    gaussian.SetStandardDeviations(sigma, sigma, 0)

    # 4) 求梯度 —— Canny 第二步
    gradient = vtkImageGradient()
    gradient.SetInputConnection(gaussian.GetOutputPort())
    gradient.SetDimensionality(2)

    magnitude = vtkImageMagnitude()
    magnitude.SetInputConnection(gradient.GetOutputPort())

    # 5) 非极大值抑制 —— Canny 第三步
    non_max = vtkImageNonMaximumSuppression()
    non_max.SetMagnitudeInputData(magnitude.GetOutput())
    non_max.SetVectorInputData(gradient.GetOutput())
    non_max.SetDimensionality(2)

    # 6) 将梯度向量 pad 为 3 分量，供 StructuredPoints / Edgels 使用
    pad = vtkImageConstantPad()
    pad.SetInputConnection(gradient.GetOutputPort())
    pad.SetOutputNumberOfScalarComponents(3)
    pad.SetConstant(0)

    # 7) 图像 -> 规则点集，携带梯度方向
    i2sp_link = vtkImageToStructuredPoints()
    i2sp_link.SetInputConnection(non_max.GetOutputPort())
    i2sp_link.SetVectorInputData(pad.GetOutput())

    # 8) 连接 edgels —— 低阈值 + 方向一致性链接
    link_edgels = vtkLinkEdgels()
    link_edgels.SetInputConnection(i2sp_link.GetOutputPort())
    link_edgels.SetGradientThreshold(low_threshold)

    # 9) 高阈值过滤
    threshold = vtkThreshold()
    threshold.SetInputConnection(link_edgels.GetOutputPort())
    threshold.SetThresholdFunction(vtkThreshold.THRESHOLD_UPPER)
    threshold.SetUpperThreshold(high_threshold)
    threshold.AllScalarsOff()

    geometry = vtkGeometryFilter()
    geometry.SetInputConnection(threshold.GetOutputPort())

    # 10) 子像素定位
    i2sp_grad = vtkImageToStructuredPoints()
    i2sp_grad.SetInputConnection(magnitude.GetOutputPort())
    i2sp_grad.SetVectorInputData(pad.GetOutput())

    subpixel = vtkSubPixelPositionEdgels()
    subpixel.SetInputConnection(geometry.GetOutputPort())
    subpixel.SetGradMapsData(i2sp_grad.GetStructuredPointsOutput())

    # 11) 折线整理
    strip = vtkStripper()
    strip.SetInputConnection(subpixel.GetOutputPort())

    # 可视化：底图 + 边缘
    gray_mapper = vtkImageMapper()
    gray_mapper.SetInputConnection(luminance.GetOutputPort())
    gray_mapper.SetColorWindow(255)
    gray_mapper.SetColorLevel(127.5)

    gray_actor = vtkActor()
    gray_actor.SetMapper(gray_mapper)

    edge_mapper = vtkPolyDataMapper()
    edge_mapper.SetInputConnection(strip.GetOutputPort())
    edge_mapper.ScalarVisibilityOff()

    edge_actor = vtkActor()
    edge_actor.SetMapper(edge_mapper)
    edge_actor.GetProperty().SetColor(1.0, 1.0, 1.0)
    edge_actor.GetProperty().SetAmbient(1.0)
    edge_actor.GetProperty().SetDiffuse(0.0)
    edge_actor.GetProperty().SetLineWidth(1.5)

    return gray_actor, edge_actor, strip


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="VTK Canny edge detection demo")
    parser.add_argument(
        "--image",
        type=Path,
        default=None,
        help="输入 PNG 图像路径；省略则使用内置测试图",
    )
    parser.add_argument("--sigma", type=float, default=1.0, help="高斯平滑标准差")
    parser.add_argument("--low", type=float, default=2.0, help="Canny 低阈值 (vtkLinkEdgels)")
    parser.add_argument("--high", type=float, default=10.0, help="Canny 高阈值 (vtkThreshold)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.image is not None:
        reader = vtkPNGReader()
        reader.SetFileName(str(args.image))
        reader.Update()
        image_source = reader
        title = f"VTK Canny | {args.image.name}"
    else:
        image_source = create_test_image()
        title = "VTK Canny | built-in test image"

    gray_actor, edge_actor, _strip = build_canny_pipeline(
        image_source,
        sigma=args.sigma,
        low_threshold=args.low,
        high_threshold=args.high,
    )

    renderer = vtkRenderer()
    renderer.SetBackground(0.08, 0.12, 0.20)
    renderer.AddActor(gray_actor)
    renderer.AddActor(edge_actor)

    window = vtkRenderWindow()
    window.SetSize(900, 900)
    window.SetWindowName(title)
    window.AddRenderer(renderer)

    interactor = vtkRenderWindowInteractor()
    interactor.SetRenderWindow(window)

    window.Render()
    interactor.Start()


if __name__ == "__main__":
    main()
