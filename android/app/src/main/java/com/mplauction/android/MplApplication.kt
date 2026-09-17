package com.mplauction.android

import android.app.Application
import android.content.Context

class MplApplication : Application() {
  lateinit var container: AppContainer
    private set

  override fun onCreate() {
    super.onCreate()
    container = AppContainer()
  }
}

fun Context.appContainer(): AppContainer = (applicationContext as MplApplication).container

